import test from "node:test";
import assert from "node:assert/strict";
import {readdirSync, readFileSync} from "node:fs";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const project=resolve(fileURLToPath(new URL("..",import.meta.url)));
const source=(relative)=>readFileSync(join(project,relative),"utf8");
function filesIn(relative){
  const dir=join(project,relative);
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const child=join(relative,entry.name);
    if(entry.isDirectory())return filesIn(child);
    return entry.isFile()&&/\.(tsx|ts)$/.test(entry.name)?[child]:[];
  });
}

test("all public UI copy uses 凤启家序 (Chinese) and Family OS (English)",()=>{
  const files=[
    ...filesIn("components"),
    ...filesIn("lib"),
    ...filesIn("app/[locale]")
  ];
  const retired=/家庭中心|Family Center|My Family Center|Phoenix Family OS/i;
  const violations=files.flatMap(path=>{
    const input=source(path);
    return input.split(/\r?\n/).flatMap((line,i)=>retired.test(line)?[`${path}:${i+1}`]:[]);
  });
  assert.deepEqual(violations,[],"Retired public name may not be reintroduced in web UI source");
});

test("Chinese and English brand labels do not mix or repeat the product name",()=>{
  assert.doesNotMatch(source("components/homepage-v6.tsx"),/进入Family OS|Family OS 预览栏目/);
  assert.doesNotMatch(source("components/health-landing.tsx"),/Family OS · Family OS/);
  assert.doesNotMatch(source("lib/v5-metadata.ts"),/Family OS 凤启家序/);
});

test("website product labels keep one bilingual name without changing account routes",()=>{
  for(const path of [
    "components/homepage-v6.tsx","components/family-center-v2.tsx",
    "components/site-ecosystem-content.tsx","components/v5-site.tsx",
    "components/customer-account.tsx","lib/site-directory.ts"
  ]){
    const text=source(path);
    assert.match(text,/凤启家序/,`${path} Chinese display name`);
    assert.match(text,/Family OS/,`${path} English display name`);
  }
  const centerRoute=source("app/[locale]/family-center/page.tsx");
  assert.match(centerRoute,/FamilyCenterV2/);
  assert.match(centerRoute,/customerAuthEnabled\(\)/);
  assert.match(centerRoute,/readCustomerSession/);
  assert.match(source("components/customer-account.tsx"),/\`\/\$\{locale\}\/family-center\`/);
  assert.match(source("components/homepage-v6.tsx"),/localizedHref\(locale, "\/account"\)/);
});
