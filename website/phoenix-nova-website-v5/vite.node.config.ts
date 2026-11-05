import { fileURLToPath } from "node:url";
import vinext from "vinext";
import { defineConfig, loadEnv } from "vite";

/** Native Vinext Node output. Do not combine this build with the Worker build. */
export default defineConfig(({ mode }) => {
  const values = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [vinext()],
    resolve: {
      alias: {
        "cloudflare:workers": fileURLToPath(new URL("./build/node-cloudflare-env.mjs", import.meta.url)),
      },
    },
    define: {
      "process.env.PHOENIX_RUNTIME_TARGET": JSON.stringify("node"),
      "process.env.NEXT_PUBLIC_MAIN_ORIGIN": JSON.stringify(values.NEXT_PUBLIC_MAIN_ORIGIN || "https://phoenixnova.com.cn"),
    },
  };
});
