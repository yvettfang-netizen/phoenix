import { register } from "node:module";

// The isolated tests use Node's native type stripping without website packages.
register("data:text/javascript," + encodeURIComponent(`
  export function resolve(specifier, context, nextResolve) {
    if (context.parentURL?.includes("/lib/identity-journey") && context.parentURL.endsWith(".ts") &&
        (specifier === "./customer-auth" || specifier.startsWith("./identity-journey"))) {
      return nextResolve(specifier + ".ts", context);
    }
    return nextResolve(specifier, context);
  }
`));
