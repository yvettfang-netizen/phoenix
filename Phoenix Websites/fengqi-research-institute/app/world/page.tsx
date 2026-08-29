"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, LockKeyhole } from "lucide-react";
import styles from "./world.module.css";

type RealmId = "eastern" | "constellation" | "harmony";
type ActivePortal = RealmId | "core" | null;

type Realm = {
  id: RealmId;
  no: string;
  cn: string;
  en: string;
  href: string;
  description: string;
};

const realms: Realm[] = [
  {
    id: "eastern",
    no: "01",
    cn: "东方启境",
    en: "EASTERN THRESHOLD",
    href: "/dongfang-qijing",
    description: "从这里，进入凤启的第一重世界。",
  },
  {
    id: "constellation",
    no: "02",
    cn: "凤凰星图",
    en: "PHOENIX CONSTELLATION",
    href: "/fenghuang-xingtu",
    description: "从星图中，看见凤启的生态、产品与连接。",
  },
  {
    id: "harmony",
    no: "03",
    cn: "鸿蒙世界",
    en: "HARMONY COSMOS",
    href: "/hongmeng-world",
    description: "万象未名，世界正在生成。",
  },
];

function EasternPattern() {
  return (
    <svg viewBox="0 0 220 220" role="img" aria-label="卷草纹与日升门扉纹样">
      <circle className={styles.patternOuter} cx="110" cy="110" r="96" />
      <circle className={styles.patternTrack} cx="110" cy="110" r="82" />
      <path className={styles.vine} d="M40 105c22-31 45-32 63-7s39 25 77-4M42 128c23 27 46 27 64 3s39-24 72 5" />
      <path className={styles.vineLeaf} d="M70 79c-13-13-25-10-31 4 15 5 25 3 31-4Zm80 62c13 13 25 10 31-4-15-5-25-3-31 4Z" />
      <path className={styles.glyphLine} d="M78 142V91h64v51M70 142h80M88 142v-36h44v36" />
      <path className={styles.coralAccent} d="M90 106a20 20 0 0 1 40 0" />
      <path className={styles.sunRays} d="M110 73V61m-25 19-9-9m59 9 9-9" />
    </svg>
  );
}

function ConstellationPattern() {
  return (
    <svg viewBox="0 0 220 220" role="img" aria-label="回纹、星轨与凤凰星徽纹样">
      <circle className={styles.patternOuter} cx="110" cy="110" r="96" />
      <circle className={styles.meanderTrack} cx="110" cy="110" r="82" pathLength="64" />
      <ellipse className={styles.starOrbit} cx="110" cy="110" rx="66" ry="37" transform="rotate(-18 110 110)" />
      <ellipse className={styles.starOrbitSoft} cx="110" cy="110" rx="42" ry="70" transform="rotate(32 110 110)" />
      <path className={styles.phoenixStar} d="m110 72 9 27 27 11-27 10-9 28-10-28-27-10 27-11Z" />
      <circle className={styles.starNode} cx="46" cy="100" r="3" />
      <circle className={styles.starNode} cx="167" cy="80" r="3" />
      <circle className={styles.starNode} cx="160" cy="145" r="3" />
    </svg>
  );
}

function HarmonyPattern() {
  return (
    <svg viewBox="0 0 220 220" role="img" aria-label="水波、云气与鸿蒙球纹样">
      <defs>
        <radialGradient id="harmony-sphere" cx="35%" cy="28%" r="74%">
          <stop offset="0" stopColor="#e9faf5" stopOpacity=".9" />
          <stop offset=".48" stopColor="#79aaa8" stopOpacity=".42" />
          <stop offset="1" stopColor="#244d66" stopOpacity=".12" />
        </radialGradient>
      </defs>
      <circle className={styles.patternOuter} cx="110" cy="110" r="96" />
      <circle className={styles.patternTrack} cx="110" cy="110" r="82" />
      <circle className={styles.harmonySphere} cx="110" cy="101" r="39" fill="url(#harmony-sphere)" />
      <path className={styles.cloudLine} d="M51 83c8-15 23-18 35-7 10-24 43-25 54-2 16-8 31 0 34 15" />
      <path className={styles.waveLine} d="M42 135c18-13 34-13 51 0s33 13 51 0 30-13 39-5M51 151c15-10 29-10 44 0s30 10 45 0 25-10 34-6" />
      <circle className={styles.dust} cx="69" cy="61" r="2" />
      <circle className={styles.dust} cx="155" cy="56" r="2.5" />
      <circle className={styles.dust} cx="169" cy="113" r="1.7" />
    </svg>
  );
}

function PortalPattern({ id }: { id: RealmId }) {
  if (id === "eastern") return <EasternPattern />;
  if (id === "constellation") return <ConstellationPattern />;
  return <HarmonyPattern />;
}

function RealmGate({ realm, onActive }: { realm: Realm; onActive: (value: ActivePortal) => void }) {
  return (
    <Link
      className={`${styles.realm} ${styles[realm.id]}`}
      href={realm.href}
      onPointerEnter={() => onActive(realm.id)}
      onPointerLeave={() => onActive(null)}
      onFocus={() => onActive(realm.id)}
      onBlur={() => onActive(null)}
    >
      <span className={styles.portalVisual} aria-hidden="true">
        <span className={styles.rotatingTrack} />
        <PortalPattern id={realm.id} />
      </span>
      <span className={styles.realmCopy}>
        <small>{realm.no} · {realm.en}</small>
        <strong>{realm.cn}</strong>
        <span className={styles.reveal}>
          <em>{realm.description}</em>
          <b>进入此境 <ArrowUpRight aria-hidden="true" /></b>
        </span>
      </span>
    </Link>
  );
}

export default function NovaWorldGuide() {
  const [active, setActive] = useState<ActivePortal>(null);

  return (
    <main className={styles.page}>
      <div className={styles.nebula} aria-hidden="true" />
      <div className={styles.stars} aria-hidden="true" />

      <header className={styles.topbar}>
        <Link className={styles.back} href="/">
          <ArrowLeft aria-hidden="true" />
          返回凤启东方
        </Link>
        <Link className={styles.brand} href="/" aria-label="凤启环球 Phoenix Nova 首页">
          <Image src="/phoenix-nova-official-mark-navy-v1.png" alt="Phoenix Nova 官方羽翼标志" width={126} height={126} priority />
          <span>
            <strong>凤启环球</strong>
            <small>PHOENIX NOVA · NOVA DIGITAL</small>
          </span>
        </Link>
        <span className={styles.candidate}>WORLD GUIDE · CANDIDATE V1.1</span>
      </header>

      <section className={styles.intro} aria-labelledby="world-guide-title">
        <p>THREE REALMS · ONE LIVING CORE</p>
        <h1 id="world-guide-title">凤启世界导览</h1>
        <strong>A GUIDE TO THE NOVA WORLD</strong>
        <span>三重世界，一座中枢。</span>
        <small>由东方启境进入，从凤凰星图理解凤启，在鸿蒙世界看见一个正在生长的数字世界。</small>
      </section>

      <section className={styles.stage} data-active={active ?? undefined} aria-label="三重世界与凤凰中枢关系图">
        <svg className={styles.orbitMap} viewBox="0 0 1200 560" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="world-step-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 8 4 0 8Z" />
            </marker>
          </defs>
          <path className={styles.sequenceTrack} d="M250 310C390 86 680 77 879 164" markerEnd="url(#world-step-arrow)" />
          <path className={styles.sequenceTrack} d="M900 174C1037 252 1013 398 910 438" markerEnd="url(#world-step-arrow)" />
          <path className={`${styles.connector} ${active === "eastern" || active === "core" ? styles.connectorActive : ""}`} d="M304 311C401 321 480 310 562 288" />
          <path className={`${styles.connector} ${active === "constellation" || active === "core" ? styles.connectorActive : ""}`} d="M820 185C717 197 663 226 634 263" />
          <path className={`${styles.connector} ${active === "harmony" || active === "core" ? styles.connectorActive : ""}`} d="M836 418C739 394 674 341 637 303" />
        </svg>

        {realms.map((realm) => (
          <RealmGate realm={realm} onActive={setActive} key={realm.id} />
        ))}

        <Link
          className={styles.core}
          href="/founder/access"
          onPointerEnter={() => setActive("core")}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive("core")}
          onBlur={() => setActive(null)}
          aria-label="凤凰中枢，仅限授权进入"
        >
          <span className={styles.coreSystem} aria-hidden="true">
            <span className={styles.coreOrbit}>
              {Array.from({ length: 9 }, (_, index) => (
                <i key={index} style={{ "--node-index": index } as CSSProperties} />
              ))}
            </span>
            <span className={styles.coreMark}>
              <Image src="/phoenix-nova-official-mark-gold-v1.png" alt="" width={108} height={142} />
            </span>
          </span>
          <span className={styles.coreCopy}>
            <small>SYSTEM CORE · NOT A FOURTH REALM</small>
            <strong>凤凰中枢</strong>
            <em>PHOENIX CORE · FOUNDER MODE</em>
            <span>战略、知识、任务与神兽在此汇聚。</span>
            <b><LockKeyhole aria-hidden="true" /> 仅限授权进入 · AUTHORIZED ACCESS</b>
          </span>
        </Link>
      </section>

      <footer className={styles.sequenceNote}>
        <span>01 东方启境</span><i />
        <span>02 凤凰星图</span><i />
        <span>03 鸿蒙世界</span>
        <small>凤凰中枢为系统中枢，不属于三重世界编号。</small>
      </footer>
    </main>
  );
}
