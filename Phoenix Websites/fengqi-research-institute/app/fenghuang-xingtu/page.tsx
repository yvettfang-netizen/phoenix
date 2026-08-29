"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

type AgentGuardian = {
  id: string;
  no: string;
  name: string;
  en: string;
  aspect: string;
  focus: string;
  zoom: number;
  direction: "center" | "right" | "left" | "down" | "up";
  workspaceReady: boolean;
};

const constellationArt = "/fengqi-dongfang-canonical-immortals.png";

const agents: AgentGuardian[] = [
  {
    id: "phoenix",
    no: "00",
    name: "凤凰",
    en: "PHOENIX",
    aspect: "中心 · 统合 · 方向",
    focus: "50% 20%",
    zoom: 2.15,
    direction: "center",
    workspaceReady: true,
  },
  {
    id: "zhuque",
    no: "01",
    name: "朱雀",
    en: "ZHUQUE",
    aspect: "美与表达",
    focus: "20% 17%",
    zoom: 2.9,
    direction: "right",
    workspaceReady: true,
  },
  {
    id: "xuanwu",
    no: "02",
    name: "玄武",
    en: "XUANWU",
    aspect: "边界与秩序",
    focus: "88% 82%",
    zoom: 3.05,
    direction: "left",
    workspaceReady: true,
  },
  {
    id: "baize",
    no: "03",
    name: "白泽",
    en: "BAIZE",
    aspect: "求真与辨识",
    focus: "15% 49%",
    zoom: 3.1,
    direction: "right",
    workspaceReady: false,
  },
  {
    id: "qingluan",
    no: "04",
    name: "青鸾",
    en: "QINGLUAN",
    aspect: "传递与共鸣",
    focus: "70% 48%",
    zoom: 3,
    direction: "down",
    workspaceReady: false,
  },
  {
    id: "qilin",
    no: "05",
    name: "麒麟",
    en: "QILIN",
    aspect: "教育与生长",
    focus: "17% 76%",
    zoom: 3,
    direction: "up",
    workspaceReady: false,
  },
  {
    id: "aoyu",
    no: "06",
    name: "鳌鱼",
    en: "AOYU",
    aspect: "学习与跃迁",
    focus: "35% 88%",
    zoom: 3.45,
    direction: "left",
    workspaceReady: true,
  },
  {
    id: "pixiu",
    no: "07",
    name: "貔貅",
    en: "PIXIU",
    aspect: "守成与丰盛",
    focus: "59% 78%",
    zoom: 3.15,
    direction: "left",
    workspaceReady: false,
  },
  {
    id: "qinglong",
    no: "08",
    name: "青龙",
    en: "QINGLONG",
    aspect: "生长与连接",
    focus: "87% 18%",
    zoom: 2.85,
    direction: "left",
    workspaceReady: false,
  },
];

function AgentPortal({ agent }: { agent: AgentGuardian }) {
  const content = (
    <>
      <span className="xingtu-agent-avatar">
        <Image
          className={`xingtu-agent-image xingtu-agent-image-${agent.direction}`}
          src={constellationArt}
          alt={`${agent.name} AI Agent 头像，朝向中央凤凰`}
          fill
          sizes={agent.id === "phoenix" ? "150px" : "92px"}
          style={{
            objectPosition: agent.focus,
            "--agent-zoom": agent.zoom,
          } as CSSProperties}
        />
      </span>
      <span className="xingtu-agent-copy">
        <small>NO.{agent.no} · {agent.en}</small>
        <strong>{agent.name}</strong>
        <em>{agent.aspect}</em>
      </span>
      <span className="xingtu-agent-pending">{agent.workspaceReady ? "空间模板 · 已验证" : "空间内容 · 待配置"}</span>
    </>
  );

  const className = `xingtu-agent xingtu-agent-${agent.id} is-linked${agent.workspaceReady ? " is-ready" : " is-pending"}`;
  const href = "/founder/access";
  return (
    <Link className={className} href={href} aria-label={`查看${agent.name}的授权进入边界`}>
      {content}
    </Link>
  );
}

export default function FenghuangXingtu() {
  return (
    <main className="xingtu-v2-page">
      <div className="xingtu-v2-paper" aria-hidden="true" />

      <header className="xingtu-v2-topbar">
        <Link href="/" className="xingtu-v2-back">返回东方画卷</Link>
        <div className="xingtu-v2-realm-name">
          <small>SECOND REALM · FOUNDER MODE</small>
          <strong>凤凰星图</strong>
        </div>
        <div className="xingtu-v2-founder">
          <small>FOUNDER</small>
          <strong>FIONA｜鹤潼</strong>
        </div>
      </header>

      <section className="xingtu-v2-composition" aria-labelledby="xingtu-v2-title">
        <aside className="xingtu-v2-whisper xingtu-v2-whisper-left">
          <small>REALITY · 现实</small>
          <p>一个尚未做完的决定</p>
          <p>一段需要被看见的成长</p>
          <p>一个正在成形的方向</p>
        </aside>

        <section className="xingtu-v2-core">
          <header className="xingtu-v2-intro">
            <p>PHOENIX NOVA · AI AGENT CONSTELLATION</p>
            <h1 id="xingtu-v2-title">九位守护者面向凤凰，<br />共同构成只属于你的 AI 星图。</h1>
          </header>

          <div className="xingtu-v2-field" aria-label="凤凰居中、八位神兽面向凤凰的 AI Agent 星图">
            <span className="xingtu-v2-orbit xingtu-v2-orbit-one" aria-hidden="true" />
            <span className="xingtu-v2-orbit xingtu-v2-orbit-two" aria-hidden="true" />
            <span className="xingtu-v2-light" aria-hidden="true" />

            {agents.map((agent) => (
              <AgentPortal agent={agent} key={agent.id} />
            ))}

            <p className="xingtu-v2-field-note">凤凰中枢已接入 · 玄武／鳌鱼／朱雀模板已验证</p>
          </div>

          <Link className="xingtu-v2-threshold" href="/founder/hongmeng">
            <small>THIRD REALM · PRIVATE INNER WORLD</small>
            <strong>回到我的鸿蒙世界</strong>
            <span>进入仍在生长、尚未被完全定义的思想深处</span>
          </Link>
        </section>

        <aside className="xingtu-v2-whisper xingtu-v2-whisper-right">
          <small>FOUNDER ACCESS · 私人入口</small>
          <p>点击中央凤凰进入凤凰中枢</p>
          <p>点击八方神兽进入统一神兽空间</p>
          <p>真实 Agent 位于工作空间的更深一层</p>
        </aside>
      </section>
    </main>
  );
}
