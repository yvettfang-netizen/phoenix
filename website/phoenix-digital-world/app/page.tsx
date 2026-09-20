"use client";

import {
  BookOpenCheck,
  BrainCircuit,
  ArrowUpRight,
  Feather,
  Globe2,
  GraduationCap,
  Landmark,
  Palette,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PHOENIX_EAST_URL = "https://phoenix-east-candidate.yvettfang.chatgpt.site";

type Guardian = {
  id: string;
  no: string;
  cn: string;
  en: string;
  domain: string;
  description: string;
  icon: typeof Sparkles;
  orbit: string;
  visual: string;
};

const phoenix: Guardian = {
  id: "phoenix",
  no: "00",
  cn: "凤凰神君",
  en: "PHOENIX",
  domain: "AI 总控中枢",
  description: "承接 Founder 目标，统筹任务、调度八方仙灵，并将结果汇总为可执行的闭环。",
  icon: Sparkles,
  orbit: "",
  visual: "/guardian-phoenix-gate1.png",
};

const guardians: Guardian[] = [
  {
    id: "zhuque",
    no: "01",
    cn: "朱雀仙子",
    en: "ZHUQUE",
    domain: "视觉与体验",
    description: "统一 Phoenix 的界面、视觉系统与品牌体验，完成设计规范与视觉验收。",
    icon: Palette,
    orbit: "orbit-one",
    visual: "/guardian-zhuque-gate1.png",
  },
  {
    id: "xuanwu",
    no: "02",
    cn: "玄武君",
    en: "XUANWU",
    domain: "技术与工程",
    description: "负责代码、架构、安全、性能、部署与技术中控，让系统稳定运行。",
    icon: ShieldCheck,
    orbit: "orbit-two",
    visual: "/guardian-xuanwu-gate1.png",
  },
  {
    id: "baize",
    no: "03",
    cn: "白泽先生",
    en: "BAIZE",
    domain: "知识与审核",
    description: "沉淀知识、核验事实、治理规则，守住专业判断与风险边界。",
    icon: BookOpenCheck,
    orbit: "orbit-three",
    visual: "/guardian-baize.png",
  },
  {
    id: "qingluan",
    no: "04",
    cn: "青鸾仙子",
    en: "QINGLUAN",
    domain: "内容与传播",
    description: "把被确认的知识转化为内容，协调 Phoenix 的表达与多平台传播。",
    icon: Feather,
    orbit: "orbit-four",
    visual: "/guardian-qingluan.png",
  },
  {
    id: "qilin",
    no: "05",
    cn: "麒麟圣母",
    en: "QILIN",
    domain: "教育与人才",
    description: "研究教育路径、人才成长与长期培养，连接孩子、家庭与未来。",
    icon: GraduationCap,
    orbit: "orbit-five",
    visual: "/guardian-qilin.png",
  },
  {
    id: "aoyu",
    no: "06",
    cn: "鳌鱼童子",
    en: "AOYU",
    domain: "学习与智慧",
    description: "服务学习洞察、ASKWISE 与方法优化，让每一次学习都有清晰反馈。",
    icon: BrainCircuit,
    orbit: "orbit-six",
    visual: "/guardian-aoyu.png",
  },
  {
    id: "pixiu",
    no: "07",
    cn: "貔貅少君",
    en: "PIXIU",
    domain: "财富与资源",
    description: "研究家庭财富、资源连接与长期安排，为重要选择提供稳健入口。",
    icon: Landmark,
    orbit: "orbit-seven",
    visual: "/guardian-pixiu.png",
  },
  {
    id: "qinglong",
    no: "08",
    cn: "青龙君",
    en: "QINGLONG",
    domain: "增长与全球连接",
    description: "连接增长机会、生态伙伴与全球视野，让成熟能力走向更远的地方。",
    icon: Globe2,
    orbit: "orbit-eight",
    visual: "/guardian-qinglong.png",
  },
];

function PortalDialog({ guardian, children }: { guardian: Guardian; children: React.ReactNode }) {
  const Icon = guardian.icon;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="portal-dialog portal-dialog-unified">
        <div className="dialog-visual dialog-visual-intro">
          <Image
            src={guardian.visual}
            alt={`${guardian.cn}的独立仙灵形象介绍图`}
            width={1254}
            height={1254}
            sizes="(max-width: 680px) 88vw, 500px"
          />
        </div>
        <div className="dialog-mark" aria-hidden="true"><Icon /></div>
        <DialogHeader>
          <p className="dialog-kicker">NO.{guardian.no} · {guardian.en}</p>
          <DialogTitle>{guardian.cn}｜{guardian.domain}</DialogTitle>
          <DialogDescription>{guardian.description}</DialogDescription>
        </DialogHeader>
        <div className="dialog-rule" />
        <p className="dialog-note">九大仙灵共居一幅山海长卷，各守其境、彼此协同。</p>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  return (
    <main>
      <section className="hero" id="top">
        <div className="hero-world" id="world" aria-label="可点击的九大仙灵图景">
          <div className="world-heading">
            <span>FIRST REALM · 东方启境</span>
            <div className="realm-title">
              <strong>凤启东方</strong>
              <small>PHOENIX NOVA DIGITAL WORLD</small>
            </div>
            <p className="realm-guide">
              <span>鹤潼引路 · 凤凰执中 · 九大仙灵各守其境</span>
              <small>轻触仙灵 · 认识凤启的九种守护能力</small>
            </p>
          </div>
          <div className="guardian-worldmap">
            <Image
              className="worldmap-art"
              src="/fengqi-dongfang-canonical-immortals.png"
              alt="鹤潼仙子与仙鹤引路、凤凰居中、九大仙灵共栖山海的东方启境"
              width={1586}
              height={992}
              priority
            />
            <div className="cloud-veil cloud-veil-one" aria-hidden="true" />
            <div className="cloud-veil cloud-veil-two" aria-hidden="true" />
            <div className="cloud-veil cloud-veil-three" aria-hidden="true" />
            {[phoenix, ...guardians].map((guardian) => (
              <PortalDialog guardian={guardian} key={guardian.id}>
                <button className={`world-hotspot hotspot-${guardian.id}`} type="button" aria-label={`进入${guardian.cn}${guardian.domain}`}>
                  <span><small>NO.{guardian.no}</small><strong>{guardian.cn}</strong><em>{guardian.domain}</em></span>
                </button>
              </PortalDialog>
            ))}
          </div>
          <span className="scroll-ornament scroll-ornament-top" aria-hidden="true" />
          <span className="scroll-ornament scroll-ornament-bottom" aria-hidden="true" />
        </div>
        <nav className="realm-entry" aria-label="三重空间入口">
          <Link className="realm-tab realm-tab-one" href="/dongfang-qijing"><small>第一重</small><span>东方启境</span></Link>
          <Link className="realm-tab realm-tab-two" href="/fenghuang-xingtu"><small>第二重</small><span>凤凰星图</span></Link>
          <Link className="realm-tab realm-tab-three" href="/hongmeng-world" aria-label="进入第三重：鸿蒙世界"><small>第三重</small><span>鸿蒙世界</span></Link>
        </nav>
        <a
          className="world-guide-entry"
          href={PHOENIX_EAST_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="进入凤启东方 Phoenix East"
        >
          <span>前往凤启东方</span>
          <small>PHOENIX EAST · HERITAGE DESIGN</small>
          <ArrowUpRight aria-hidden="true" />
        </a>
      </section>
    </main>
  );
}
