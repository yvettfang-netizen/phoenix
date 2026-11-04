// Frontend rehearsal only: no Cloudflare bindings or production data.
export function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") return {
    url: "data:text/javascript,export const env = Object.freeze({});", shortCircuit: true,
  };
  return nextResolve(specifier, context);
}
