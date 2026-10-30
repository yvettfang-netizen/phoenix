import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { createV5Worker } from "./worker-fixture.mjs";

const origin = "http://localhost";
const request = (worker, path) => worker.dispatchFetch(`${origin}${path}`, {
  headers: { accept: "text/html" },
  redirect: "manual",
});

async function page(worker, path) {
  const response = await request(worker, path);
  return { response, html: await response.text() };
}

const source = readFileSync(new URL("../lib/health-compass.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { dimensions } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("Health family pages render in both locales with all six canonical directions", async t => {
  const worker = createV5Worker();
  t.after(() => worker.dispose());

  for (const locale of ["zh", "en"]) {
    const { response, html } = await page(worker, `/${locale}/health/family`);
    assert.equal(response.status, 200, `/${locale}/health/family`);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    assert.match(html, /health-family|family-consultation/i);

    for (const dimension of dimensions) {
      const title = dimension.title[locale === "zh" ? 0 : 1];
      assert.ok(html.includes(title), `${locale}: missing ${title}`);
    }
  }
});

test("Health family keeps the controlled Compass gate and preserves explicit consultation boundaries", async t => {
  const off = createV5Worker();
  const on = createV5Worker({ HEALTH_COMPASS_PREVIEW: "1" });
  t.after(async () => { await off.dispose(); await on.dispose(); });

  for (const locale of ["zh", "en"]) {
    const familyOff = await page(off, `/${locale}/health/family`);
    assert.equal(familyOff.response.status, 200);
    assert.doesNotMatch(familyOff.html, new RegExp(`href="/${locale}/compass/health`));
    assert.equal((await request(off, `/${locale}/compass/health`)).status, 404);

    const familyOn = await page(on, `/${locale}/health/family`);
    assert.match(familyOn.html, new RegExp(`href="/${locale}/compass/health`));
    assert.equal((await request(on, `/${locale}/compass/health`)).status, 200);
    assert.match(familyOn.html, /data-health-compass|Health Compass|健康罗盘/i);

    assert.match(familyOff.html, new RegExp(`href="/${locale}/health#consultation"`));
    assert.match(familyOn.html, new RegExp(`href="/${locale}/health#consultation"`));
    assert.match(familyOff.html, /id="family-consultation"/);
    assert.match(familyOff.html, /href="#family-consultation"/);

    if (locale === "zh") {
      assert.match(familyOff.html, /(?:问卷|评估).{0,40}(?:不|不会).{0,40}(?:传输|上传|同步|写入)/s);
    } else {
      assert.match(familyOff.html, /(?:questionnaire|assessment).{0,80}(?:not|never).{0,80}(?:sent|transferred|uploaded|synced|shared|written)/is);
    }
  }

  assert.equal((await request(off, "/compass/health")).status, 404);
});

test("Invalid Health family locales remain unavailable and Health landing links to family entry", async t => {
  const worker = createV5Worker();
  t.after(() => worker.dispose());

  assert.equal((await request(worker, "/fr/health/family")).status, 404);
  assert.equal((await request(worker, "/fr/health")).status, 404);

  for (const locale of ["zh", "en"]) {
    const { response, html } = await page(worker, `/${locale}/health`);
    assert.equal(response.status, 200);
    assert.match(html, new RegExp(`href="/${locale}/health/family`));
  }
});
