/** Server-only preview gate. Off unless explicitly enabled in a controlled candidate. */
export function healthPreviewEnabled(): boolean {
  return process.env.HEALTH_COMPASS_PREVIEW === "1";
}

