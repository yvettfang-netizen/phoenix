import type { MetadataRoute } from "next";
// Review builds must not advertise candidate URLs for public indexing.
export default function sitemap(): MetadataRoute.Sitemap { return []; }
