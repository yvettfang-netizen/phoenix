import type { MetadataRoute } from "next";

/** Matches the existing whole-site private-review/noindex release gate. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
