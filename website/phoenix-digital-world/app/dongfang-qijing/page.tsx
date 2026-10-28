import Image from "next/image";
import Link from "next/link";

const paths = [
  {
    no: "01",
    href: "/guest/child",
    title: "从孩子开始",
    subtitle: "为孩子寻找方向",
    detail: "Compass · ASKWise · 凤启学苑 · Growth Blueprint",
  },
  {
    no: "02",
    href: "/dongfang-qijing/world",
    title: "走进凤启",
    subtitle: "了解凤启的世界",
    detail: "理念 · 五大领域 · 九大仙灵 · Founder Story",
  },
  {
    no: "03",
    href: "/dongfang-qijing/collaboration",
    title: "了解合作",
    subtitle: "与凤启共同成长",
    detail: "生态合作 · 产品闭环 · 伙伴支持 · 协作标准",
  },
];

export default function DongfangQijing() {
  return (
    <main className="qijing-page">
      <Image
        className="qijing-background"
        src="/fengqi-dongfang-canonical-immortals.png"
        alt="东方启境山海长卷"
        width={1586}
        height={992}
        priority
      />
      <div className="qijing-mist" aria-hidden="true" />
      <Link className="qijing-back" href="/">返回画卷</Link>

      <section className="qijing-content" aria-labelledby="qijing-title">
        <header className="qijing-heading">
          <p>FIRST REALM · GUEST MODE</p>
          <h1 id="qijing-title">东方启境</h1>
          <span>访客进入凤启的第一重世界</span>
        </header>

        <div className="qijing-paths" aria-label="东方启境三条访客路径">
          {paths.map((path) => (
            <Link className="qijing-gate" href={path.href} key={path.no}>
              <small>{path.no}</small>
              <strong>{path.title}</strong>
              <span>{path.subtitle}</span>
              <em>{path.detail}</em>
            </Link>
          ))}
        </div>

        <p className="qijing-line">先从你此刻最关心的事情开始。</p>
      </section>
    </main>
  );
}
