import Image from "next/image";
import Link from "next/link";

export type RealmDetailConfig = {
  eyebrow: string;
  title: string;
  subtitle: string;
  statement: string;
  tone: "child" | "world" | "collaboration";
  focus: string;
  modules: Array<{ no: string; title: string; en: string; description: string }>;
};

export function RealmDetail({ config }: { config: RealmDetailConfig }) {
  return (
    <main className={`realm-detail-page realm-detail-${config.tone}`}>
      <Image
        className="realm-detail-background"
        src="/fengqi-dongfang-canonical-immortals.png"
        alt="东方启境山海背景"
        width={1586}
        height={992}
        style={{ objectPosition: config.focus }}
        priority
      />
      <div className="realm-detail-veil" aria-hidden="true" />
      <Link className="realm-detail-back" href="/dongfang-qijing">返回东方启境</Link>

      <section className="realm-detail-content" aria-labelledby="realm-detail-title">
        <header className="realm-detail-heading">
          <p>{config.eyebrow}</p>
          <h1 id="realm-detail-title">{config.title}</h1>
          <strong>{config.subtitle}</strong>
          <span>{config.statement}</span>
        </header>

        <div className="realm-module-grid">
          {config.modules.map((module) => (
            <article className="realm-module" key={module.no}>
              <small>{module.no}</small>
              <p>{module.en}</p>
              <h2>{module.title}</h2>
              <span>{module.description}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
