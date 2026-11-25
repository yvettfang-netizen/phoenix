/** Read-only availability and metadata checks. Never submits a consultation. */
import { pathToFileURL } from "node:url";

const host = "https://phoenixnova.com.cn";
const tags = (html, tag) => html.match(new RegExp("<" + tag + "\\b[^>]*>", "gi")) ?? [];
const attribute = (tag, key) => tag.match(new RegExp("\\b" + key + "=[\"']([^\"']*)[\"']", "i"))?.[1];
const value = (html, tag, key, expected, get) =>
  tags(html, tag).find(markup => attribute(markup, key) === expected)?.match(new RegExp("\\b" + get + "=[\"']([^\"']*)[\"']", "i"))?.[1];

export async function checkLaunch({ send = fetch, indexApproved = false } = {}) {
  const checks = [];
  const add = (name, passed, evidence) => checks.push({ name, passed, evidence });
  async function read(url) {
    const response = await send(url, { redirect: "manual", signal: AbortSignal.timeout(10000) });
    return { status: response.status, headers: response.headers, text: await response.text() };
  }
  async function check(name, operation) {
    try { await operation(); }
    catch (error) { add(name, false, error.code ?? error.name ?? "REQUEST_FAILED"); }
  }

  await Promise.all([
    check("HTTP redirects to HTTPS", async () => {
      const result = await read("http://phoenixnova.com.cn/zh");
      add("HTTP redirects to HTTPS", [301, 302, 307, 308].includes(result.status) &&
        result.headers.get("location") === host + "/zh", result.status);
    }),
    ...["zh", "en"].flatMap(locale => [
      check(locale + " homepage", async () => {
        const url = host + "/" + locale;
        const page = await read(url);
        const canonical = value(page.text, "link", "rel", "canonical", "href");
        const zhAlt = value(page.text, "link", "hreflang", "zh-Hans", "href");
        const enAlt = value(page.text, "link", "hreflang", "en", "href");
        const hasNoindex = [value(page.text, "meta", "name", "robots", "content"),
          page.headers.get("x-robots-tag")].some(entry => /\bnoindex\b/i.test(entry ?? ""));
        const language = attribute(tags(page.text, "html")[0] ?? "", "lang");
        add(locale + " homepage", page.status === 200 && canonical === url && zhAlt === host + "/zh" &&
          enAlt === host + "/en" && language === (locale === "zh" ? "zh-Hans" : "en") &&
          hasNoindex !== indexApproved, { status: page.status, canonical, language, hasNoindex });
      }),
      check(locale + " consultation and privacy", async () => {
        const [form, privacy] = await Promise.all([read(host + "/" + locale + "/consultation"), read(host + "/" + locale + "/privacy")]);
        const formEnabled = /<input\b[^>]*\bname="email"/i.test(form.text);
        const policyLinked = tags(form.text, "a").some(markup => {
          const href = attribute(markup, "href");
          return href === host + "/" + locale + "/privacy" || href === "/" + locale + "/privacy";
        });
        add(locale + " consultation and privacy", form.status === 200 && privacy.status === 200 &&
          formEnabled && policyLinked, { form: form.status, privacy: privacy.status, formEnabled, policyLinked });
      }),
    ]),
    check("index policy", async () => {
      const [robots, sitemap] = await Promise.all([read(host + "/robots.txt"), read(host + "/sitemap.xml")]);
      const paths = [...sitemap.text.matchAll(/<loc>([^<]*)<\/loc>/g)].map(match => match[1]).sort();
      const lines = robots.text.split(/\r?\n/);
      const allows = lines.filter(line => /^allow:/i.test(line)).map(line => line.trim().toLowerCase()).sort();
      const allowed = indexApproved ? ["allow: /en$", "allow: /zh$"] : [];
      const expected = indexApproved ? [host + "/en", host + "/zh"] : [];
      add("index policy", robots.status === 200 && sitemap.status === 200 &&
        lines.some(line => /^disallow:\s*\/\s*$/i.test(line)) &&
        JSON.stringify(allows) === JSON.stringify(allowed) && JSON.stringify(paths) === JSON.stringify(expected),
      { robots: robots.status, sitemap: sitemap.status, paths, allows });
    }),
  ]);
  return checks.sort((left, right) => left.name.localeCompare(right.name));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--index-approved")) throw new Error("Only --index-approved is supported");
  const checks = await checkLaunch({ indexApproved: args.includes("--index-approved") });
  console.log(JSON.stringify(checks, null, 2));
  if (!checks.every(check => check.passed)) process.exitCode = 1;
}
