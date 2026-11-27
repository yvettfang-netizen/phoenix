import { readStaffConsultationEmail } from "./staff-contact.mjs";
import { readPayload, uuidV7 } from "./receiver.mjs";
import { createHash, randomBytes } from "node:crypto";
import { workbenchHtml } from "./staff-workbench.mjs";

const leadUuid = "[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const detailsPath = new RegExp("^/internal/website-consultations/(" + leadUuid + ")/(contact|assign|reassign|cancel|complete|assignees)$");
const staffId = new RegExp("^" + leadUuid + "$");
const queuePath = "/internal/website-consultations";
const workbenchPath = queuePath + "/workbench";
const duplicatePath = new RegExp("^" + queuePath + "/duplicates/(propose|review|merge)$");
const viewPath = new RegExp("^" + queuePath + "/views/(DISPATCHER|ADVISER|FOUNDER)$");

function duplicateArgs(operation, body) {
  const fields = {
    propose: ["firstLeadId", "secondLeadId"],
    review: ["candidateId", "decision"],
    merge: ["candidateId", "sourceLeadId", "targetLeadId"],
  }[operation];
  if (!body || Object.keys(body).length !== fields.length ||
      !fields.every(field => typeof body[field] === "string" &&
        (field === "decision" ? ["CONFIRMED", "DISMISSED"].includes(body[field]) : staffId.test(body[field])))) return null;
  return fields.map(field => body[field]);
}

async function runDuplicate(client, identity, operation, args) {
  const actor = [identity.issuer, identity.subject];
  if (operation === "propose") {
    const evidence = createHash("sha256").update(JSON.stringify(["manual-pair-v1", ...args.toSorted()])).digest("hex");
    const { rows } = await client.query(
      "SELECT crm.propose_website_consultation_duplicate($1,$2,$3,$4,$5,$6,$7) AS candidate",
      [...actor, ...args, uuidV7(), uuidV7(), evidence],
    );
    return rows[0]?.candidate ? reply(200, { candidateId: rows[0].candidate }) : reply(404, { code: "NOT_FOUND" });
  }
  const statement = operation === "review"
    ? "SELECT crm.review_website_consultation_duplicate($1,$2,$3,$4,$5) AS accepted"
    : "SELECT crm.merge_website_consultation_duplicate($1,$2,$3,$4,$5,$6,$7) AS accepted";
  const ids = operation === "review" ? [uuidV7()] : [uuidV7(), uuidV7()];
  const { rows } = await client.query(statement, [...actor, ...args, ...ids]);
  return rows[0]?.accepted === true ? reply(200, { accepted: true }) : reply(404, { code: "NOT_FOUND" });
}

function reply(status, body) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  } });
}

/** Host this handler behind the existing staff-session verifier on the private gateway. */
export function createWebsiteConsultationStaffHandler({ origin, authenticateStaff, gatewayPool, contactKey }) {
  if (typeof origin !== "string" || new URL(origin).origin !== origin || !origin.startsWith("https://") ||
      typeof authenticateStaff !== "function" || typeof gatewayPool?.connect !== "function" ||
      !Buffer.isBuffer(contactKey) || contactKey.length !== 32) {
    throw new Error("Invalid website staff gateway configuration");
  }
  const key = Buffer.from(contactKey);

  return async function handle(request) {
    const url = new URL(request.url);
    const contact = detailsPath.exec(url.pathname);
    const duplicate = duplicatePath.exec(url.pathname)?.[1];
    const duplicateList = url.pathname === queuePath + "/duplicates";
    const workbench = url.pathname === workbenchPath;
    const views = url.pathname === queuePath + "/views";
    const view = viewPath.exec(url.pathname)?.[1];
    if (url.origin !== origin || url.search || (url.pathname !== queuePath && !workbench && !contact && !duplicate && !duplicateList && !views && !view)) {
      return reply(404, { code: "NOT_FOUND" });
    }
    const write = duplicate || (contact && contact[2] !== "assignees");
    if (request.method !== (write ? "POST" : "GET")) return reply(405, { code: "METHOD_NOT_ALLOWED" });
    const sourceOrigin = request.headers.get("origin");
    if ((write && sourceOrigin !== origin) || (sourceOrigin && sourceOrigin !== origin) ||
        request.headers.get("sec-fetch-site") === "cross-site") return reply(403, { code: "ACCESS_DENIED" });

    try {
      const identity = await authenticateStaff(request);
      if (!identity || typeof identity.issuer !== "string" || !identity.issuer ||
          typeof identity.subject !== "string" || !identity.subject ||
          identity.issuer.length > 500 || identity.subject.length > 500) {
        return reply(401, { code: "STAFF_AUTH_REQUIRED" });
      }
      // No confirmed Founder-to-organization contract exists. A business title,
      // browser role header or dispatcher grant must never confer this scope.
      if (view === "FOUNDER") return reply(403, { code: "FOUNDER_SCOPE_UNCONFIRMED" });
      if (workbench) {
        const nonce = randomBytes(18).toString("base64");
        return new Response(workbenchHtml(nonce), { headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
          "Content-Security-Policy": `default-src 'none'; connect-src 'self'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`,
        } });
      }
      let assignee = null;
      const duplicateInput = duplicate ? duplicateArgs(duplicate, await readPayload(request)) : null;
      if (duplicate && !duplicateInput) return reply(400, { code: "INVALID_DUPLICATE_REQUEST" });
      if (contact?.[2] === "assign" || contact?.[2] === "reassign") {
        const input = await readPayload(request);
        if (!input || Object.keys(input).join(",") !== "assigneeId" ||
            typeof input.assigneeId !== "string" || !staffId.test(input.assigneeId)) {
          return reply(400, { code: "INVALID_ASSIGNMENT" });
        }
        assignee = input.assigneeId;
      }
      const client = await gatewayPool.connect();
      let reusable = false;
      try {
        // Only this handler manages the dedicated pool, using autocommit queries.
        await client.query("DISCARD ALL");
        await client.query("SET ROLE phoenix_website_consultation_staff_gateway");
        let response;
        if (views) {
          const { rows } = await client.query("SELECT * FROM crm.list_website_consultation_staff_views($1,$2)",
            [identity.issuer, identity.subject]);
          response = reply(200, { views: rows.map(row => row.view_kind),
            founder: { status: "HOLD", code: "FOUNDER_SCOPE_UNCONFIRMED" } });
        } else if (view) {
          const { rows } = await client.query("SELECT crm.read_website_consultation_staff_view($1,$2,$3) AS view",
            [identity.issuer, identity.subject, view]);
          response = rows[0]?.view ? reply(200, rows[0].view) : reply(403, { code: "VIEW_ACCESS_DENIED" });
        } else if (duplicateList) {
          const { rows } = await client.query("SELECT * FROM crm.list_website_consultation_duplicates($1,$2)",
            [identity.issuer, identity.subject]);
          const { rows: suggested } = await client.query("SELECT * FROM crm.suggest_website_consultation_duplicates($1,$2)",
            [identity.issuer, identity.subject]);
          response = reply(200, { items: rows.map(row => ({
            candidateId: row.candidate_id,
            firstLeadId: row.first_lead_id,
            secondLeadId: row.second_lead_id,
            status: row.status,
            canReview: row.can_review,
          })), suggestions: suggested.map(row => ({
            firstLeadId: row.first_lead_id, secondLeadId: row.second_lead_id,
          })) });
        } else if (duplicate) {
          response = await runDuplicate(client, identity, duplicate, duplicateInput);
        } else if (contact?.[2] === "contact") {
          const email = await readStaffConsultationEmail(client, identity, contact[1], key);
          response = email ? reply(200, { email }) : reply(404, { code: "NOT_FOUND" });
        } else if (contact?.[2] === "assignees") {
          const { rows } = await client.query("SELECT * FROM crm.list_website_consultation_assignees($1,$2,$3)",
            [identity.issuer, identity.subject, contact[1]]);
          response = reply(200, { items: rows.map(row => ({ id: row.principal_id, name: row.display_name })) });
        } else if (contact) {
          const result = await client.query(
            "SELECT crm.act_on_website_consultation($1,$2,$3,$4,$5,$6) AS task",
            [identity.issuer, identity.subject, contact[1], contact[2].toUpperCase(), assignee, uuidV7()],
          );
          const task = result.rows[0]?.task;
          response = task ? reply(200, { taskId: task }) : reply(404, { code: "NOT_FOUND" });
        } else {
          const { rows } = await client.query("SELECT * FROM crm.list_website_consultation_staff_queue($1,$2)",
            [identity.issuer, identity.subject]);
          response = reply(200, { items: rows.map(row => ({
            leadId: row.lead_id,
            service: row.service_domain,
            locale: row.locale,
            receivedAt: row.received_at,
            status: row.lead_status,
            assigneeId: row.assignee_id,
            nextDueAt: row.next_due_at,
          })) });
        }
        await client.query("DISCARD ALL");
        reusable = true;
        return response;
      } finally {
        client.release(!reusable);
      }
    } catch {
      return reply(503, { code: "STAFF_GATEWAY_UNAVAILABLE" });
    }
  };
}
