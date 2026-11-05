"use client";
import { useEffect, useState } from "react";
type Summary = { family: { familyRef: string; displayName: string } };
type Student = { studentRef: string; displayName: string };
export function CanonicalFamilyPreview({ locale, sessionMode = false }: { locale: "zh" | "en"; sessionMode?: boolean }) {
  const [value, setValue] = useState<{ family: Summary["family"]; students: Student[] } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const get = async (part: string) => {
      const r = await fetch(`/api/canonical/${sessionMode ? "session-projections" : "projections"}/${part}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      if (!r.ok) throw new Error("Unavailable"); return r.json();
    };
    void Promise.all([get("family"), get("students")]).then(([f,s]) => setValue({ family: f.family, students: s.items }))
      .catch(() => { if (!controller.signal.aborted) { setValue(null); setFailed(true); } });
    return () => controller.abort();
  }, [sessionMode]);
  const zh = locale === "zh";
  return <section data-canonical-family-preview>
    <div role="status" aria-live="polite">{failed ? (zh ? "家庭资料暂不可用或未获授权。" : "Family details unavailable or not authorized.") :
      !value ? (zh ? "正在读取……" : "Loading…") : null}</div>
    {value && !failed ? <><h2 data-family-name>{value.family.displayName}</h2>
      <h3>{zh ? "可查看的学生" : "Authorized student summaries"}</h3>
      {value.students.length ? <ul>{value.students.map(s => <li data-student-summary key={s.studentRef}>{s.displayName}</li>)}</ul> :
        <p>{zh ? "暂无可查看的学生资料。" : "No authorized student summaries."}</p>}</> : null}
  </section>;
}
