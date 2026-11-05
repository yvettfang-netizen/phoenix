/** The Node host has no trusted Sites identity-header injector. */
export function nodeRequestHeaders(input: Headers, pathname: string): Headers {
  const headers = new Headers(input);
  for (const name of [...headers.keys()]) {
    if (name.startsWith("oai-") || name.startsWith("x-phoenix-")) headers.delete(name);
  }
  const locale = /^\/(zh|en)\/(?:health(?:\/|$)|compass\/health(?:\/|$))/.exec(pathname)?.[1];
  if (locale) headers.set("x-phoenix-health-locale", locale);
  return headers;
}
