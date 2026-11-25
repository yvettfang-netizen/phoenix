import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { test } from "node:test";
import { createStaffSessionAuthenticator } from "./staff-session.mjs";
import { createBrokerVerifier } from "../../../../Phoenix Compass/education compass/server/src/auth/broker-identity.ts";

const now = 2000000000000;
const issuer = "https://broker.example.test/";
const subject = "usr_synthetic_staff";
const assertion = { iss: issuer, sub: subject, aud: "phoenix-canonical-postgresql", exp: now / 1000 + 30 };
const valid = {
  profile: "STAFF", issuer, subject, expiresAt: now + 20000,
  brokerAssertion: "server-held-assertion", assertCurrent: async () => true,
};
const request = new Request("https://staff.example.test/internal/website-consultations", {
  headers: { "x-principal-id": "spoofed-principal", "x-role": "admin", authorization: "Bearer browser-value" },
});
function auth(session = valid, verified = assertion, clock = () => now) {
  return createStaffSessionAuthenticator({
    now: clock,
    readStaffSession: async () => session,
    brokerVerifier: { async verify(token) {
      assert.equal(token, "server-held-assertion");
      return verified;
    } },
  });
}

test("returns only the verified staff issuer and subject", async () => {
  assert.deepEqual(await auth()(request), { issuer, subject });
  assert.equal(await auth(null)(request), null);
});

test("rejects customer sessions, changed subject, wrong audience and expired assertions", async () => {
  assert.equal(await auth({ ...valid, profile: "CUSTOMER" })(request), null);
  assert.equal(await auth(valid, { ...assertion, sub: "usr_other" })(request), null);
  assert.equal(await auth(valid, { ...assertion, aud: "other" })(request), null);
  assert.equal(await auth(valid, { ...assertion, exp: now / 1000 })(request), null);
});

test("checks live session revocation and expiry after verifying the assertion", async () => {
  assert.equal(await auth({ ...valid, assertCurrent: async () => false })(request), null);
  let time = now;
  const session = { ...valid, assertCurrent: async () => { time += 21000; return true; } };
  assert.equal(await auth(session, assertion, () => time)(request), null);
  assert.throws(() => createStaffSessionAuthenticator({}), /has not been configured/);
});

test("reuses the Canonical verifier with a signed synthetic employee assertion", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const jwksUri = issuer + "jwks";
  const verifier = createBrokerVerifier({ issuer, audience: assertion.aud, jwksUri }, async uri => {
    assert.equal(uri, jwksUri);
    return { keys: [{ ...publicKey.export({ format: "jwk" }), alg: "ES256", use: "sig", kid: "fixture" }] };
  }, () => now);
  const encode = object => Buffer.from(JSON.stringify(object)).toString("base64url");
  const body = encode({ alg: "ES256", kid: "fixture", typ: "JWT" }) + "." + encode({
    ...assertion, iat: now / 1000 - 1, nbf: now / 1000 - 1, jti: "028347ec-7740-4000-a000-000000000001",
  });
  const signature = sign("sha256", Buffer.from(body), { key: privateKey, dsaEncoding: "ieee-p1363" });
  let brokerAssertion = body + "." + signature.toString("base64url");
  const authenticate = createStaffSessionAuthenticator({
    now: () => now, readStaffSession: async () => ({ ...valid, brokerAssertion }), brokerVerifier: verifier,
  });
  assert.deepEqual(await authenticate(request), { issuer, subject });
  signature[0] ^= 1;
  brokerAssertion = body + "." + signature.toString("base64url");
  assert.equal(await authenticate(request), null);
});
