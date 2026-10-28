import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type AgentGuardian = {
  id: string;
  no: string;
  name: string;
  en: string;
  aspect: string;
  visual: string;
};

const agents: AgentGuardian[] = [
  {
    id: "zhuque",
    no: "01",
    name: "朱雀",
    en: "ZHUQUE",
    aspect: "美与表达",
    visual: "/guardian-zhuque-gate1.png",
  },
  {
    id: "qinglong",
    no: "08",
    name: "青龙",
    en: "QINGLONG",
    aspect: "生长与连接",
    visual: "/guardian-qinglong.png",
  },
  {
    id: "baize",
    no: "03",
    name: "白泽",
    en: "BAIZE",
    aspect: "求真与辨识",
    visual: "/guardian-baize.png",
  },
  {
    id: "qingluan",
    no: "04",
    name: "青鸾",
    en: "QINGLUAN",
    aspect: "传递与共鸣",
    visual: "/guardian-qingluan.png",
  },
  {
    id: "qilin",
    no: "05",
    name: "麒麟",
    en: "QILIN",
    aspect: "教育与生长",
    visual: "/guardian-qilin.png",
  },
  {
    id: "aoyu",
    no: "06",
    name: "鳌鱼",
    en: "AOYU",
    aspect: "学习与跃迁",
    visual: "/guardian-aoyu.png",
  },
  {
    id: "pixiu",
    no: "07",
    name: "貔貅",
    en: "PIXIU",
    aspect: "守成与丰盛",
    visual: "/guardian-pixiu.png",
  },
  {
    id: "xuanwu",
    no: "02",
    name: "玄武",
    en: "XUANWU",
    aspect: "边界与秩序",
    visual: "/guardian-xuanwu-gate1.png",
  },
];

function AtlasConnections() {
  return (
    <svg className="atlas-connections" viewBox="0 0 1000 640" preserveAspectRatio="none" aria-hidden="true">
      <ellipse className="atlas-ring atlas-ring-outer" cx="500" cy="320" rx="390" ry="254" />
      <ellipse className="atlas-ring atlas-ring-inner" cx="500" cy="320" rx="260" ry="178" />
      <path className="atlas-connection" d="M500 320C403 257 306 194 196 141" />
      <path className="atlas-connection" d="M500 320C597 257 694 194 804 141" />
      <path className="atlas-connection" d="M500 320C383 320 245 320 126 320" />
      <path className="atlas-connection" d="M500 320C617 320 755 320 874 320" />
      <path className="atlas-connection" d="M500 320C403 383 306 446 196 499" />
      <path className="atlas-connection" d="M500 320C462 407 424 494 386 565" />
      <path className="atlas-connection" d="M500 320C538 407 576 494 614 565" />
      <path className="atlas-connection" d="M500 320C597 383 694 446 804 499" />
      <g className="atlas-stars">
        <circle cx="167" cy="196" r="3" />
        <circle cx="267" cy="112" r="2" />
        <circle cx="731" cy="112" r="2" />
        <circle cx="833" cy="196" r="3" />
        <circle cx="91" cy="413" r="2" />
        <circle cx="909" cy="413" r="2" />
        <circle cx="302" cy="548" r="2" />
        <circle cx="698" cy="548" r="2" />
        <circle cx="500" cy="70" r="2" />
        <circle cx="500" cy="585" r="2" />
      </g>
    </svg>
  );
}

function AgentPortal({ agent }: { agent: AgentGuardian }) {
  return (
    <Link
      className={`atlas-agent atlas-agent-${agent.id}`}
      href={`/founder/beasts/${agent.id}`}
      aria-label={`进入${agent.name} AI Agent 工作台`}
    >
      <span className="atlas-agent-avatar">
        <Image
          src={agent.visual}
          alt={`${agent.name} AI Agent 头像`}
          fill
          sizes="(max-width: 680px) 66px, 96px"
        />
      </span>
      <span className="atlas-agent-copy">
        <small>NO.{agent.no} · {agent.en}</small>
        <strong>{agent.name}</strong>
        <em>{agent.aspect}</em>
        <span>进入工作台 <ArrowUpRight aria-hidden="true" /></span>
      </span>
    </Link>
  );
}

function PhoenixCore() {
  return (
    <Link className="atlas-phoenix" href="/founder/phoenix" aria-label="进入凤凰中枢工作台">
      <span className="atlas-phoenix-avatar">
        <Image
          src="/guardian-phoenix-gate1.png"
          alt="凤凰 AI Agent 中枢头像"
          fill
          sizes="(max-width: 680px) 142px, 190px"
        />
      </span>
      <span className="atlas-phoenix-copy">
        <small>00 · PHOENIX CORE</small>
        <strong>凤凰</strong>
        <em>AI 总控中枢 · 进入工作台 <ArrowUpRight aria-hidden="true" /></em>
      </span>
    </Link>
  );
}

export default function FenghuangXingtu() {
  return (
    <main className="atlas-page">
      <div className="atlas-paper" aria-hidden="true" />

      <header className="atlas-topbar">
        <Link href="/" className="atlas-back">
          <ArrowLeft aria-hidden="true" />
          返回第一重：东方启境
        </Link>
        <div className="atlas-title">
          <small>SECOND REALM · PHOENIX NOVA</small>
          <strong>凤凰星图</strong>
          <span>PHOENIX STAR ATLAS</span>
        </div>
        <Link href="/founder/phoenix" className="atlas-workbench">
          凤凰工作台
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </header>

      <section className="atlas-content" aria-labelledby="atlas-title">
        <header className="atlas-intro">
          <p>PHOENIX NOVA · AI AGENT CONSTELLATION</p>
          <h1 id="atlas-title">以凤凰为心，<br />看见八方仙灵的协同网络。</h1>
          <span>每一个头像，都对应一个真实的 AI Agent 工作台。</span>
        </header>

        <section className="atlas-map" aria-label="凤凰居中、八位 AI Agent 仙灵环绕的凤凰星图">
          <span className="atlas-map-seal atlas-map-seal-left" aria-hidden="true">凤</span>
          <span className="atlas-map-seal atlas-map-seal-right" aria-hidden="true">图</span>
          <AtlasConnections />
          {agents.map((agent) => <AgentPortal agent={agent} key={agent.id} />)}
          <PhoenixCore />
          <p className="atlas-map-note">点击任一头像，进入对应 AI Agent 仙灵工作台</p>
        </section>

        <nav className="atlas-realms" aria-label="三重空间">
          <Link href="/" className="atlas-realm">
            <small>01 · FIRST REALM</small>
            <strong>东方启境</strong>
            <span>从这里开始</span>
          </Link>
          <Link href="/fenghuang-xingtu" className="atlas-realm is-current" aria-current="page">
            <small>02 · SECOND REALM</small>
            <strong>凤凰星图</strong>
            <span>AI Agent 协同网络</span>
          </Link>
          <Link href="/hongmeng-world" className="atlas-realm">
            <small>03 · THIRD REALM</small>
            <strong>鸿蒙世界</strong>
            <span>思想正在生长</span>
          </Link>
        </nav>
      </section>
    </main>
  );
}
