function runWorkbench() {
  const endpoint = "/internal/website-consultations";
  const list = document.querySelector("#lead-list");
  const notice = document.querySelector("#workbench-status");
  const refresh = document.querySelector("#refresh-queue");
  const duplicates = document.querySelector("#duplicate-list");
  const firstLead = document.querySelector("#duplicate-first");
  const secondLead = document.querySelector("#duplicate-second");
  const labels = { EDUCATION: "教育", IDENTITY: "身份", WEALTH: "财富", HEALTH: "健康" };

  async function request(path = "", body) {
    const response = await fetch(endpoint + path, body === undefined ? {
      cache: "no-store",
    } : {
      method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(response.status === 401 ? "员工会话已失效，请重新登录。" : "当前操作未完成。请刷新队列后重试。");
    return response.json();
  }

  function element(tag, text) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  }

  function action(label, perform) {
    const button = element("button", label);
    button.type = "button";
    button.addEventListener("click", async () => {
      button.disabled = true;
      try { await perform(button); }
      catch (error) { notice.textContent = error.message; }
      finally { button.disabled = false; }
    });
    return button;
  }

  async function loadDuplicates() {
    const { items, suggestions } = await request("/duplicates");
    duplicates.replaceChildren();
    for (const pair of suggestions) {
      const row = element("li");
      row.append(element("p", "可能重复 · 待人工判断"),
        element("code", pair.firstLeadId + " / " + pair.secondLeadId),
        action("提交此候选", async () => {
          await request("/duplicates/propose", pair);
          await loadDuplicates();
          notice.textContent = "已提交，等待另一名员工审核。";
        }));
      duplicates.append(row);
    }
    for (const item of items) {
      const row = element("li");
      row.append(element("code", item.firstLeadId + " / " + item.secondLeadId));
      row.append(element("p", item.status === "PENDING" ? "待独立审核" : "已确认重复"));
      if (item.canReview) {
        for (const [decision, label] of [["CONFIRMED", "确认重复"], ["DISMISSED", "驳回候选"]]) {
          row.append(action(label, async () => {
            await request("/duplicates/review", { candidateId: item.candidateId, decision });
            await loadDuplicates();
            notice.textContent = "已记录审核。";
          }));
        }
      }
      if (item.status === "CONFIRMED") {
        for (const [sourceLeadId, targetLeadId, label] of [
          [item.firstLeadId, item.secondLeadId, "保留第二条"],
          [item.secondLeadId, item.firstLeadId, "保留第一条"],
        ]) {
          row.append(action(label, async () => {
            if (!window.confirm("确认合并，并保留线索 " + targetLeadId + "？")) return;
            await request("/duplicates/merge", { candidateId: item.candidateId, sourceLeadId, targetLeadId });
            await loadQueue();
            notice.textContent = "已记录合并。";
          }));
        }
      }
      duplicates.append(row);
    }
  }

  async function loadQueue() {
    refresh.disabled = true;
    list.replaceChildren();
    duplicates.replaceChildren();
    for (const select of [firstLead, secondLead]) select.replaceChildren(new Option("请选择线索", ""));
    notice.textContent = "正在读取线索…";
    try {
      const { items } = await request();
      for (const item of items) {
        for (const select of [firstLead, secondLead]) select.append(new Option(item.leadId, item.leadId));
        const row = element("li");
        const entry = element("article");
        const path = "/" + encodeURIComponent(item.leadId);
        entry.append(element("h2", (labels[item.service] ?? "服务") + "咨询"),
          element("p", (item.status === "CONTACTED" ? "已联系" : item.status === "NEW" ? "新线索" : item.status) +
            " · " + new Date(item.receivedAt).toLocaleString("zh-CN")),
          element("code", item.leadId));
        if (item.nextDueAt && item.status === "NEW") {
          const due = new Date(item.nextDueAt);
          if (!Number.isNaN(due.getTime())) {
            const overdue = due.getTime() <= Date.now();
            const hint = element("p", (overdue ? "待办已逾期 · " : "首次联系待办截止 · ") + due.toLocaleString("zh-CN"));
            if (overdue) hint.setAttribute("role", "status");
            entry.append(hint);
          }
        }
        const controls = element("div");
        controls.className = "actions";
        const email = element("p");
        email.setAttribute("aria-live", "polite");
        controls.append(action("查看邮箱", async button => {
          if (email.textContent) {
            email.replaceChildren();
            button.textContent = "查看邮箱";
            return;
          }
          const result = await request(path + "/contact", {});
          email.textContent = result.email;
          button.textContent = "隐藏邮箱";
        }));
        if (item.status === "NEW" && (!item.assigneeId || item.nextDueAt)) {
          const reassign = Boolean(item.assigneeId);
          const label = element("label", "顾问");
          const adviser = element("select");
          adviser.setAttribute("aria-label", "顾问");
          adviser.append(new Option("请选择顾问", ""));
          label.append(adviser);
          controls.append(action(reassign ? "加载接手顾问" : "加载可分配顾问", async button => {
            const { items: people } = await request(path + "/assignees");
            if (!people.length) {
              notice.textContent = "当前暂无可分配的顾问。";
              return;
            }
            for (const { id, name } of people) adviser.append(new Option(name, id));
            button.replaceWith(label, action(reassign ? "重新分派" : "分配", async () => {
              if (!adviser.value) throw new Error("请选择顾问。");
              await request(path + (reassign ? "/reassign" : "/assign"), { assigneeId: adviser.value });
              await loadQueue();
              notice.textContent = reassign ? "已重新分派跟进。" : "已分配跟进。";
            }));
          }));
        }
        if (item.assigneeId && item.status === "NEW" && item.nextDueAt) {
          controls.append(action("完成首次跟进", async () => {
            await request(path + "/complete", {});
            await loadQueue();
            notice.textContent = "已记录首次跟进。";
          }));
          controls.append(action("取消首次跟进", async () => {
            if (!window.confirm("确认取消这条首次跟进待办？")) return;
            await request(path + "/cancel", {});
            await loadQueue();
            notice.textContent = "已取消首次跟进。";
          }));
        }
        entry.append(controls, email);
        row.append(entry);
        list.append(row);
      }
      await loadDuplicates();
      notice.textContent = items.length ? "已载入获授权的线索。" : "暂无获授权的线索。";
    } catch (error) {
      notice.textContent = error.message;
    } finally {
      refresh.disabled = false;
    }
  }

  refresh.addEventListener("click", loadQueue);
  document.querySelector("#duplicate-actions").append(action("提议重复线索", async () => {
    if (!firstLead.value || !secondLead.value || firstLead.value === secondLead.value) {
      throw new Error("请选择两条不同的线索。");
    }
    await request("/duplicates/propose", { firstLeadId: firstLead.value, secondLeadId: secondLead.value });
    await loadDuplicates();
    notice.textContent = "已提交，等待另一名员工审核。";
  }));
  window.addEventListener("pagehide", () => {
    list.replaceChildren();
    duplicates.replaceChildren();
    for (const select of [firstLead, secondLead]) select.replaceChildren();
  });
  window.addEventListener("pageshow", event => { if (event.persisted) void loadQueue(); });
  void loadQueue();
}

export function workbenchHtml(nonce) {
  return `<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>官网咨询工作台｜Phoenix Nova</title>
<style nonce="${nonce}">
body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#f8f6f1;color:#003b46}
main{max-width:50rem;margin:auto;padding:1.25rem}ol{list-style:none;padding:0;display:grid;grid-template-columns:minmax(0,1fr);gap:1rem}
article{background:white;padding:1rem;border-radius:.6rem}h2,p{margin:.5rem 0}code{overflow-wrap:anywhere}
.actions{display:flex;flex-wrap:wrap;gap:.6rem;align-items:end;margin-top:1rem}label{display:grid;grid-template-columns:minmax(0,1fr);gap:.25rem;min-width:0;max-width:100%}
#duplicate-actions label{flex:1 1 14rem}#duplicate-actions select{width:100%;min-width:0}
button,select{font:inherit;min-height:44px;border:1px solid #003b46;border-radius:.4rem;padding:0 .65rem}
select{max-width:100%;box-sizing:border-box}button{background:#003b46;color:white}button:disabled{opacity:.6}
</style></head><body><main><h1>官网咨询工作台</h1>
<button id="refresh-queue" type="button">刷新队列</button><p id="workbench-status" role="status">正在读取线索…</p>
<section aria-label="重复线索"><h2>重复线索</h2>
<div id="duplicate-actions" class="actions">
<label>第一条线索<select id="duplicate-first"></select></label>
<label>第二条线索<select id="duplicate-second"></select></label>
</div><ol id="duplicate-list" aria-label="待处理重复候选"></ol></section>
<ol id="lead-list" aria-label="咨询线索"></ol><noscript>此工作台需要 JavaScript。</noscript>
</main><script nonce="${nonce}">(${runWorkbench.toString()})();</script></body></html>`;
}
