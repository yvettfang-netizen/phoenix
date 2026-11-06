"use client";
import { useEffect, useState } from "react";
import type { CatalogItem } from "@/lib/canonical-learning-catalog";

export function LearningCourseCatalog({ locale }: { locale: "zh" | "en" }) {
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/learning/catalog", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("Unavailable"); return response.json(); })
      .then(data => setItems(data.items)).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, []);
  const zh = locale === "zh";
  return <section aria-labelledby="published-courses-title" data-canonical-course-catalog>
    <h3 id="published-courses-title">{zh ? "已发布课程" : "Published courses"}</h3>
    <div role="status" aria-live="polite">{failed ? (zh ? "课程目录暂不可用。" : "Course catalog is unavailable.") :
      items === null ? (zh ? "正在读取课程……" : "Loading courses…") :
      items.length === 0 ? (zh ? "暂无已发布课程。" : "No published courses.") : null}</div>
    {items && !failed ? <ul>{items.map(item => <li key={item.versionRef}>{item.title}</li>)}</ul> : null}
  </section>;
}
