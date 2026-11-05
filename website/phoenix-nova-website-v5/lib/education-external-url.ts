/** External school links are navigation only; never accept executable or credential URLs. */
export function safeEducationWebsite(value: unknown): string | null {
  if (typeof value !== "string" || /[\u0000-\u0020\u007f\\]/.test(value) || !/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname || url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) return null;
    return url.href;
  } catch { return null; }
}
