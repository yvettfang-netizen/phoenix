import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
const code = ts.transpileModule(readFileSync(new URL("../lib/education-publication.ts", import.meta.url), "utf8"), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const m = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const fact = {state:"published",substantiveContent:true,sourcesVerified:true,editor:"synthetic-editor",reviewer:"synthetic-reviewer",lastSubstantiveUpdate:"2026-11-01",validUntil:"2027-01-01"};
const release = {...m.EDUCATION_RELEASE,domainVerified:true,founderApproved:true,allowSearchCrawlers:true};
test("draft and review origin never become indexable without independent release approval",()=>{
 assert.equal(m.mayIndexEducation(fact,m.EDUCATION_RELEASE,"2026-11-02"),false);
 assert.equal(m.mayIndexEducation(fact,release,"2026-11-02"),true);
 for(const override of [{state:"draft"},{sourcesVerified:false},{substantiveContent:false},{reviewer:null},{validUntil:"2026-11-01"},{lastSubstantiveUpdate:"invalid"}])assert.equal(m.mayIndexEducation({...fact,...override},release,"2026-11-02"),false);
});
test("locale canonical is self-referential and alternates are reciprocal",()=>{
 const en=m.educationAlternates("en","universities/hku"); const zh=m.educationAlternates("zh","universities/hku");
 assert.equal(en.canonical,"http://edu.phoenixnova.com.cn/en/education/universities/hku");
 assert.deepEqual(en.languages,zh.languages);assert.notEqual(en.canonical,zh.canonical);
 assert.throws(()=>m.educationContentPath("en","../family-center"));
});
test("structured content cannot break out of a JSON-LD script",()=>{
 const encoded=m.safeJsonLd({name:"</script><script>alert(1)</script>"});assert.equal(encoded.includes("<"),false);assert.equal(JSON.parse(encoded).name,"</script><script>alert(1)</script>");
});
