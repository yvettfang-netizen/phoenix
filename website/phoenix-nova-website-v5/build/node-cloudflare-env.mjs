/**
 * The Node deployment serves the public website without Cloudflare bindings.
 * An empty immutable environment keeps customer authentication disabled even
 * if unrelated host environment variables happen to use the same names.
 */
export const env = Object.freeze({});
