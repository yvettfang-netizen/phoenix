/** Private Review policy. Search/training release requires separate approval. */
export function GET() {
  return new Response("User-agent: *\nDisallow: /\n", { headers: {"content-type":"text/plain; charset=utf-8","cache-control":"no-store"} });
}
