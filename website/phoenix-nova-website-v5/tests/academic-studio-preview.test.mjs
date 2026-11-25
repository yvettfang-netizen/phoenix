import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../docs/previews/academic-studio-v21");
const js = readFileSync(resolve(root, "preview.js"), "utf8");
const css = readFileSync(resolve(root, "preview.css"), "utf8");
const index = readFileSync(resolve(root, "index.html"), "utf8");
const views = [
  ["student-center", "学生学习中心"],
  ["course-detail", "课程详情"],
  ["student-timetable", "学生课表"],
  ["parent-growth", "家长成长报告"],
  ["teacher-workbench", "教师工作台"],
  ["admin-workbench", "教学管理员工作台"],
];

test("six previews render independently with synthetic-only notice and no business write", () => {
  for (const [view, label] of views) {
    const page = readFileSync(resolve(root, `${view}.html`), "utf8");
    assert.match(page, new RegExp(`data-view="${view}"`));
    assert.match(index, new RegExp(`href="${view}\\.html"`));
    const app = { innerHTML: "" };
    const doc = {
      body: { dataset: { view } },
      title: "",
      getElementById(id) { assert.equal(id, "app"); return app; },
    };
    runInNewContext(js, { document: doc });
    assert.match(doc.title, new RegExp(label));
    assert.match(app.innerHTML, /合成示例/);
    assert.match(app.innerHTML, /无真实登录、数据库读写/);
    assert.match(app.innerHTML, /官方标志/);
    assert.match(app.innerHTML, /aria-current="page"/);
    assert.doesNotMatch(app.innerHTML, /<form\b|onclick=|contenteditable=/i);
  }
});

test("official light-background logo and V5/V6 base tokens are reused", () => {
  const logo = resolve(root, "../../../public/brand/official/v3/phoenix-nova-header@2x.png");
  assert.ok(existsSync(logo));
  assert.equal(
    createHash("sha256").update(readFileSync(logo)).digest("hex").toUpperCase(),
    "C566AA2813A1D08D02C71230C7E2360BA2C681A056F1A7FDB900C2A40396B4DA",
  );
  for (const token of ["#003b46", "#8caea4", "#c99b50", "#f8f6f1"]) {
    assert.ok(css.includes(token), `missing approved base token ${token}`);
  }
  assert.doesNotMatch(css, /#0d1b2a/i);
  assert.doesNotMatch(js, /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/);
});
