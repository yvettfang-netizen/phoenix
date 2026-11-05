import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  wealthArticles,
  wealthDimensions,
  wealthFaqs,
  wealthRegions,
  wealthServices,
} from "../lib/wealth-content.ts";

const testsDir = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(testsDir, "..");
const read = (relativePath) =>
  readFileSync(resolve(websiteRoot, relativePath), "utf8");
const landingSource = read("components/wealth-landing.tsx");
const assessmentSource = read("components/wealth-assessment.tsx");
const navSource = read("components/v5-site.tsx");
const directoryComponentSource = read("components/site-directory.tsx");
const directorySource = read("lib/site-directory.ts");
const detailRouteSource = read("app/[locale]/wealth/[section]/[slug]/page.tsx");

const contentText = JSON.stringify({
  wealthArticles,
  wealthDimensions,
  wealthFaqs,
  wealthRegions,
  wealthServices,
});
const pageText = [contentText, landingSource, detailRouteSource].join("\n");

function assertUniqueSlugs(items, label) {
  const slugs = items.map((item) => item.slug);
  assert.equal(
    new Set(slugs).size,
    slugs.length,
    `${label} slugs must be unique`,
  );
  assert.ok(
    slugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)),
    `${label} slugs must be stable URL slugs`,
  );
}

function assertCopy(copy, label) {
  assert.ok(
    Array.isArray(copy) && copy.length === 2,
    `${label} must have Chinese and English copy`,
  );
  assert.ok(
    copy.every((value) => typeof value === "string" && value.trim()),
    `${label} copy must be non-empty`,
  );
}

function publicAssetPath(asset) {
  assert.match(
    asset,
    /^\/[a-z0-9/_-]+\.[a-z0-9]+$/i,
    `internal asset path is malformed: ${asset}`,
  );
  assert.doesNotMatch(
    asset,
    /\.\./,
    `internal asset path may not escape public/: ${asset}`,
  );
  return resolve(websiteRoot, "public", ...asset.slice(1).split("/"));
}

test("Wealth services keep five bounded planning points and unique route slugs", () => {
  assert.equal(
    wealthServices.length,
    5,
    "Wealth must expose exactly five core services",
  );
  assertUniqueSlugs(wealthServices, "service");
  for (const service of wealthServices) {
    assertCopy(service.title, `${service.slug}.title`);
    assertCopy(service.intro, `${service.slug}.intro`);
    assert.equal(
      service.items.length,
      5,
      `${service.slug} must have exactly five planning points`,
    );
    service.items.forEach((item, index) =>
      assertCopy(item, `${service.slug}.items[${index}]`),
    );
  }
});

test("Wealth Compass exposes the frozen six-dimension names", () => {
  assert.deepEqual(
    wealthDimensions.map((dimension) => [dimension.code, dimension.name[0]]),
    [
      ["D1", "家庭目标与决策协同"],
      ["D2", "资产负债可视与结构"],
      ["D3", "现金流与应急韧性"],
      ["D4", "保障与风险隔离"],
      ["D5", "跨境身份与税务协调"],
      ["D6", "传承治理与信息连续"],
    ],
  );
  wealthDimensions.forEach((dimension) => {
    assertCopy(dimension.name, `${dimension.code}.name`);
    assertCopy(dimension.description, `${dimension.code}.description`);
  });
});

test("Wealth regions, guides and internal imagery are complete", () => {
  assert.equal(wealthRegions.length, 6, "Wealth must expose six regions");
  assert.equal(wealthArticles.length, 6, "Wealth must expose six GEO guides");
  assertUniqueSlugs(wealthRegions, "region");
  assertUniqueSlugs(wealthArticles, "guide");

  for (const region of wealthRegions) {
    assertCopy(region.name, `${region.slug}.name`);
    assertCopy(region.intro, `${region.slug}.intro`);
    assert.ok(
      region.questions.length > 0,
      `${region.slug} needs region questions`,
    );
    region.questions.forEach((question, index) =>
      assertCopy(question, `${region.slug}.questions[${index}]`),
    );
    assert.ok(
      existsSync(publicAssetPath(region.image)),
      `missing Wealth region image: ${region.image}`,
    );
  }

  for (const guide of wealthArticles) {
    assertCopy(guide.title, `${guide.slug}.title`);
    assertCopy(guide.summary, `${guide.slug}.summary`);
    assert.ok(guide.sections.length > 0, `${guide.slug} needs sections`);
    guide.sections.forEach((section, index) => {
      assertCopy(section.title, `${guide.slug}.sections[${index}].title`);
      assertCopy(section.body, `${guide.slug}.sections[${index}].body`);
    });
    assert.ok(guide.checklist.length > 0, `${guide.slug} needs a checklist`);
    guide.checklist.forEach((item, index) =>
      assertCopy(item, `${guide.slug}.checklist[${index}]`),
    );
  }

  const hero = "/images/wealth-v3/family-harbour.png";
  assert.match(
    landingSource,
    new RegExp(`['"]${hero.replaceAll("/", "\\/")}['"]`),
    "Wealth hero must be wired into the landing page",
  );
  assert.ok(
    existsSync(publicAssetPath(hero)),
    `missing Wealth hero image: ${hero}`,
  );
});

test("Wealth copy contains no product price or return promise", () => {
  const pricePattern =
    /(?:HK\$|US\$|\b(?:HKD|CNY|RMB|USD|GBP|EUR)\b|[¥￥])\s*[\d,]+(?:\.\d+)?|(?:价格|售价|收费)\s*(?:为|：|:)\s*[\d,]+/i;
  assert.doesNotMatch(
    pageText,
    pricePattern,
    "Wealth must not publish a product price",
  );

  const forbiddenChinese =
    /(承诺(?:投资)?(?:收益|回报)|保证(?:投资)?(?:收益|回报)|稳赚|保本)/g;
  for (const match of pageText.matchAll(forbiddenChinese)) {
    const preceding = pageText[match.index - 1] ?? "";
    assert.equal(
      preceding,
      "不",
      `return claim must not be promised: ${match[0]}`,
    );
  }
  assert.doesNotMatch(
    pageText,
    /\b(?:guaranteed?|promised?)\s+(?:investment\s+)?(?:returns?|yield|profit)\b|\b(?:investment\s+)?returns?\s+(?:are\s+)?(?:guaranteed|promised)\b/i,
    "Wealth must not promise investment returns",
  );
});

test("Wealth collaboration copy does not imply a default or fake institutional partnership", () => {
  const defaultOrFakePartnership =
    /(?:官方|独家|指定|默认|唯一|专属)\s*(?:合作|合作伙伴|机构|伙伴)|(?:战略合作伙伴|合作伙伴)|已(?:与|同).{0,16}(?:合作|签约)/;
  assert.doesNotMatch(
    pageText,
    defaultOrFakePartnership,
    "Wealth must not imply a default or fabricated partner",
  );
  assert.match(
    landingSource,
    /不以特定产品或机构为默认答案/,
    "landing must state that no institution is the default answer",
  );
  assert.match(
    landingSource,
    /实际服务由相应机构另行说明、签约、收费并承担责任/,
    "landing must preserve independent institutional responsibility",
  );
});

test("Shared navigation presents Wealth as 财富 and links to the real route", () => {
  assert.match(
    navSource,
    /wealth:\s*\["财富",\s*"Wealth"\]/,
    "shared navigation must use 财富 / Wealth",
  );
  assert.match(
    navSource,
    /import\s*\{\s*WEALTH_ORIGIN\s*\}\s*from\s*["']@\/lib\/wealth-routing["']/,
    "shared navigation must use the canonical Wealth origin",
  );
  assert.match(
    navSource,
    /item\.id\s*===\s*"wealth"\s*\?\s*`\$\{WEALTH_ORIGIN\}\/\$\{locale\}`/,
    "Wealth navigation must link to the dedicated Wealth origin",
  );
  assert.doesNotMatch(
    navSource,
    /item\.id\s*===\s*"wealth"\s*\?\s*`\/\$\{locale\}\/wealth`/,
    "shared navigation must not lock the old nested Wealth path",
  );
  assert.match(
    directoryComponentSource,
    /import\s*\{\s*WEALTH_ORIGIN\s*\}\s*from\s*["']@\/lib\/wealth-routing["']/,
    "shared directory must use the canonical Wealth origin",
  );
  assert.match(
    directoryComponentSource,
    /item\.path\s*===\s*"\/wealth"\s*\?\s*`\$\{mainOrigin\s*\?\s*""\s*:\s*WEALTH_ORIGIN\}\/\$\{locale\}`/,
    "shared directory must resolve Wealth through the dedicated origin",
  );
  assert.match(
    directorySource,
    /\["财富规划",\s*"Wealth planning"\],\s*path:\s*"\/wealth"/,
    "directory must link Wealth to /wealth",
  );
  assert.doesNotMatch(
    `${navSource}\n${directorySource}`,
    /财务/,
    "Wealth shared navigation must not relabel 财富 as 财务",
  );
});

test("Wealth assessment imports only the frozen-v1 authority and detail routes fail closed", () => {
  const authorityImport = assessmentSource.match(
    /from\s+["']([^"']*frozen-v1)["']/,
  );
  assert.ok(authorityImport, "assessment must import the frozen-v1 authority");
  assert.equal(
    authorityImport[1],
    "../../../Phoenix Compass/Wealth Compass/src/domain/wealth-compass/frozen-v1",
  );
  const authorityFile = resolve(
    dirname(resolve(websiteRoot, "components/wealth-assessment.tsx")),
    `${authorityImport[1]}.ts`,
  );
  assert.ok(
    existsSync(authorityFile),
    `frozen-v1 authority file is missing: ${authorityFile}`,
  );
  assert.match(
    assessmentSource,
    /import\s*\{\s*QUESTIONS,\s*DIMENSIONS,\s*CONSENTS,\s*VERSIONS,\s*score,\s*validateAnswer/,
  );
  assert.doesNotMatch(
    assessmentSource,
    /export\s+(?:const|function)\s+(?:QUESTIONS|DIMENSIONS|CONSENTS|VERSIONS|score)\b/,
    "assessment must not copy the frozen model locally",
  );

  assert.match(detailRouteSource, /generateMetadata/);
  assert.match(
    detailRouteSource,
    /notFound\(\)/,
    "unknown Wealth detail slugs must fail closed",
  );
  assert.match(
    detailRouteSource,
    /if\s*\(!item\)\s*notFound\(\)/,
    "detail route must reject an unknown lookup result",
  );
});
