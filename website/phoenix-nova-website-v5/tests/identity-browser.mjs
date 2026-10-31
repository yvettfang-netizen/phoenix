import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = modulePath && !modulePath.endsWith(".mjs") ? createRequire(import.meta.url)(modulePath) : await import(modulePath ? pathToFileURL(modulePath).href : "playwright");
const origin = process.env.IDENTITY_ORIGIN || "http://127.0.0.1:4400";
const out = resolve(process.env.IDENTITY_EVIDENCE_DIR || "outputs/identity-v3");
await mkdir(out, { recursive: true });
const results = [];
const passed = name => { results.push({ name, status: "PASS" }); console.log(`PASS ${name}`); };
const browser = await chromium.launch({ headless: true, ...(process.env.IDENTITY_BROWSER ? { executablePath: process.env.IDENTITY_BROWSER } : {}) });
const context = await browser.newContext(); const page = await context.newPage(); const errors = [];
page.on("pageerror", error => errors.push(error.message));
async function loaded() { await page.locator('[data-identity-landing]').waitFor(); await page.evaluate(async () => { for (const image of document.images) image.loading = "eager"; await Promise.all([...document.images].map(image => image.decode())); await document.fonts.ready; }); }
try {
  for (const locale of ["zh", "en"]) for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
    await page.goto(`${origin}/${locale}/identity`, { waitUntil: "networkidle" }); await loaded();
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.getByTestId("identity-service").count(), 4);
    assert.equal(await page.getByTestId("identity-step").count(), 5);
    const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right,text:el.textContent.slice(0,50)})));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `overflow ${locale} ${width}: ${JSON.stringify(overflow)}`);
    const brands = await page.locator('.brand-asset').evaluateAll(images => images.map(image => ({ src: image.getAttribute("src"), ratio: image.clientWidth / image.clientHeight, width:image.clientWidth, filter: getComputedStyle(image).filter })));
    assert.equal(brands.length, 2); assert.ok(brands.every(brand => brand.src === "/brand/official/v3/phoenix-nova-header@2x.png" && Math.abs(brand.ratio - 1040/320) < .06 && brand.filter === "none" && brand.width>=150 && brand.width<=230));
    assert.equal(await page.evaluate(()=>getComputedStyle(document.body).margin),'0px','Shared global stylesheet must load');
    assert.equal(await page.locator('header .is-active[aria-current="page"]').first().textContent(), locale === "zh" ? "身份" : "Identity");
    assert.equal(await page.locator('header .locale-switch').getAttribute("href"), `/${locale === "zh" ? "en" : "zh"}/identity`);
    assert.equal(await page.locator('form,input[type=file]').count(), 0);
    await page.screenshot({ path: resolve(out, `identity-${locale}-${width}-full.png`), fullPage: true });
    if (width === 1440 || width === 390) {
      await page.screenshot({ path: resolve(out, `identity-${locale}-${width}-hero.png`) });
      await page.locator('footer').screenshot({ path: resolve(out, `identity-${locale}-${width}-footer.png`) });
    }
    passed(`${locale} ${width}px: route, structure, navigation, assets and no overflow`);
  }
  for (const locale of ["zh", "en"]) {
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`${origin}/${locale}/identity`, { waitUntil: "networkidle" }); await loaded();
    await page.locator('.mobile-menu summary').click();assert.ok(await page.locator('.mobile-menu[open] nav').isVisible());
    assert.ok(await page.locator('.mobile-menu nav').getByRole('link', { name: locale === "zh" ? /家庭中心/ : /Family Center/ }).isVisible());
    await page.locator('.mobile-menu .mobile-locale').click();await page.waitForURL(`**/${locale === "zh" ? "en" : "zh"}/identity`);passed(`${locale}: mobile menu and locale-preserving switch`);
    await page.goto(`${origin}/${locale}/identity`, { waitUntil: "networkidle" }); await loaded();
    for (const card of await page.getByTestId('identity-service').all()) { const detail=card.locator('details'); await detail.locator('summary').click();assert.equal(await detail.getAttribute('open')!==null,true); }
    for (const step of await page.getByTestId('identity-step').all()) { const detail=step.locator('details'); await detail.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await detail.getAttribute('open')!==null,true); }
    passed(`${locale}: all four service details and five process stages work with pointer/keyboard`);
    assert.ok(await page.getByTestId('identity-compass-controlled').isVisible());
    assert.equal(await page.locator('a[href*="/identity/assessment"],a[href*="/identity/result"]').count(),0);
    await page.getByTestId('identity-consultation').scrollIntoViewIfNeeded();
    const requests=[];const record=r=>requests.push({url:r.url(),method:r.method()}); page.on('request',record);
    const panel=page.getByTestId('identity-consultation');
    assert.ok(await panel.getByRole('button').first().isDisabled());
    await panel.locator('select').selectOption('hong-kong');await panel.getByRole('button').first().click();
    assert.match(await page.getByTestId('identity-preparation-status').textContent(),locale==='zh'?/尚未发送咨询/:/No enquiry has been sent/);
    assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);assert.equal(await page.evaluate(()=>document.cookie),'');
    assert.equal(new URL(page.url()).search,'');assert.deepEqual(requests,[]);
    await panel.getByRole('button',{name:locale==='zh'?'清空选择':'Clear selection'}).click();assert.equal(await panel.locator('select').inputValue(),'');
    page.off('request',record);passed(`${locale}: independent consultation, truthful status, clear, no network/storage/URL transmission`);
    const groups=page.locator('footer details');assert.equal(await groups.count(),5);await groups.nth(1).locator('summary').click();assert.equal(await groups.nth(1).getAttribute('open')!==null,true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);passed(`${locale}: five-group mobile Footer and expanded education links`);
    await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#identity-direction').inputValue(),'');passed(`${locale}: refresh clears preparation`);
  }
  const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const noJsPage=await noJs.newPage();
  await noJsPage.goto(`${origin}/zh/identity`,{waitUntil:'networkidle'});assert.equal(await noJsPage.locator('form,input[type=file]').count(),0);assert.ok(await noJsPage.getByTestId('identity-consultation').getByRole('button').first().isDisabled());await noJs.close();passed('No-JS route has readable content and no native submission');
  assert.deepEqual(errors,[]);passed('No browser runtime errors');
} catch(error) { results.push({name:String(error),status:'FAIL'});await page.screenshot({path:resolve(out,'failure.png'),fullPage:true}).catch(()=>{});throw error; }
finally { await writeFile(resolve(out,'identity-browser-results.json'),JSON.stringify({origin,results},null,2));await browser.close();console.log(JSON.stringify({passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length})); }
