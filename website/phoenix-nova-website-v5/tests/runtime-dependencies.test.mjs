import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const execFileAsync = promisify(execFile);
const projectRootPath = fileURLToPath(new URL("..", import.meta.url));

// @vercel/og's Node bundle contains the Satori/HarfBuzz chain. Keep its
// Node-only compatibility globals and working directory in a child process so
// this runtime fixture cannot leak process-wide state into other test files.
const renderStaticPng = async () => {
  const script = `
    import { createRequire } from "node:module";
    import { readFile } from "node:fs/promises";
    import { dirname, join } from "node:path";
    import { chdir } from "node:process";
    import { pathToFileURL } from "node:url";
    import { createElement } from "react";

    const root = ${JSON.stringify(projectRootPath)};
    const require = createRequire(pathToFileURL(join(root, "tests", "runtime-dependencies.test.mjs")));
    const ogEntry = require.resolve("@vercel/og");
    const ogDirectory = dirname(ogEntry);
    const fontPath = join(ogDirectory, "Geist-Regular.ttf");
    const harfbuzzPath = createRequire(require.resolve("satori")).resolve("harfbuzzjs/hb.wasm");
    const harfbuzzDirectory = dirname(harfbuzzPath);

    globalThis.require = require;
    globalThis.__dirname = harfbuzzDirectory;
    globalThis.__filename = join(harfbuzzDirectory, "hb.js");
    chdir(harfbuzzDirectory);

    const { ImageResponse } = await import("@vercel/og");
    const response = new ImageResponse(
      createElement(
        "div",
        {
          style: {
            alignItems: "center",
            backgroundColor: "white",
            display: "flex",
            fontFamily: "Geist",
            fontSize: 32,
            height: "100%",
            justifyContent: "center",
            width: "100%",
          },
        },
        "Phoenix",
      ),
      {
        width: 320,
        height: 180,
        fonts: [{ name: "Geist", data: await readFile(fontPath), style: "normal", weight: 400 }],
      },
    );
    const png = new Uint8Array(await response.arrayBuffer());
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    console.log(JSON.stringify({
      status: response.status,
      contentType: response.headers.get("content-type"),
      cacheControl: response.headers.get("cache-control"),
      length: png.length,
      signature: Array.from(png.slice(0, 8)),
      width: view.getUint32(16),
      height: view.getUint32(20),
    }));
  `;
  const { stdout } = await execFileAsync(
    process.execPath,
    ["--input-type=module", "-e", script],
    { cwd: projectRootPath, maxBuffer: 1024 * 1024 },
  );
  return JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
};

const searchInput = z.object({
  query: z.string().trim().min(1).max(120),
  page: z.coerce.number().int().min(1).max(100),
});

test("the Satori font chain renders a correctly sized static PNG", async () => {
  const image = await renderStaticPng();
  assert.equal(image.status, 200);
  assert.match(image.contentType ?? "", /^image\/png\b/i);
  assert.match(image.cacheControl ?? "", /max-age=/i);
  assert.ok(image.length > 100, "the renderer must return a non-empty PNG body");
  assert.deepEqual(image.signature, [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(image.width, 320, "PNG width must match the requested canvas");
  assert.equal(image.height, 180, "PNG height must match the requested canvas");
});

test("Zod validates transformed input and rejects upper bounds", () => {
  const parsed = searchInput.parse({ query: "  school  ", page: "2" });
  assert.deepEqual(parsed, { query: "school", page: 2 });

  assert.equal(searchInput.safeParse({ query: "", page: "2" }).success, false);
  assert.equal(searchInput.safeParse({ query: "x".repeat(121), page: "2" }).success, false);
  assert.equal(searchInput.safeParse({ query: "school", page: "101" }).success, false);
});

test("the form resolver accepts the Zod schema and preserves validation errors", async () => {
  const resolver = zodResolver(searchInput);
  assert.equal(typeof resolver, "function");

  const resolverOptions = {
    criteriaMode: "firstError",
    fields: {},
    shouldUseNativeValidation: false,
  };
  const valid = await resolver({ query: " school ", page: "2" }, {}, resolverOptions);
  assert.deepEqual(valid.errors, {});
  assert.deepEqual(valid.values, { query: "school", page: 2 });

  const invalid = await resolver({ query: "", page: "101" }, {}, resolverOptions);
  assert.ok(Object.keys(invalid.errors).length >= 2);
});
