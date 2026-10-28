import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Compass,
  GraduationCap,
  Radar,
  Route,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const journey = [
  {
    no: "01",
    kicker: "BEGIN WITH THE REAL QUESTION",
    title: "先看见此刻的困惑",
    lead: "方向不是从一张院校清单开始，而是从孩子真实的位置开始。",
    copy: "兴趣还没有成形、成绩出现波动、路径选择太多，或家庭成员对未来有不同判断——这些都不是需要被掩盖的问题，而是成长路径的起点。",
    icon: Sparkles,
    tone: "warm",
    detail: ["孩子现在最在意什么", "家庭此刻最担心什么", "哪一个决定最需要先澄清"],
  },
  {
    no: "02",
    kicker: "PHOENIX COMPASS™",
    title: "把方向拆成可以理解的坐标",
    lead: "从孩子、教育与家庭三个入口，形成第一张 Growth Snapshot。",
    copy: "Compass 不替家庭仓促下结论，而是把优势、风险、选择与优先级放在同一张图里，帮助家长知道下一步应该继续观察、补充信息，还是进入正式评估。",
    icon: Compass,
    tone: "mist",
    detail: ["兴趣与优势信号", "教育路径适配", "家庭资源与约束"],
  },
  {
    no: "03",
    kicker: "EDUCATION COMPASS · DEMO",
    title: "让教育选择不再只看一个分数",
    lead: "演示数据只呈现方法，不包含任何真实学生信息。",
    copy: "六个观察维度共同形成教育判断：学习基础、方法习惯、兴趣动机、环境适配、路径准备和家庭支持。每项判断都保留来源、更新时间和需要进一步核验的地方。",
    icon: Route,
    tone: "paper",
    signal: [
      { label: "学习基础", value: 72 },
      { label: "方法习惯", value: 58 },
      { label: "兴趣动机", value: 81 },
      { label: "路径准备", value: 64 },
    ],
  },
  {
    no: "04",
    kicker: "GROWTH SIGNALS · ANONYMIZED",
    title: "从一次结果，看见持续变化",
    lead: "成长信号关注趋势，不把孩子定格在某一次表现里。",
    copy: "系统记录被授权且已脱敏的变化：哪里开始稳定，哪里仍反复出现，哪一项支持真正产生了作用。家长看到的是可解释的成长过程，而不是一串孤立数据。",
    icon: Radar,
    tone: "blue",
    detail: ["表达主动性上升", "错因复盘仍需支持", "目标感逐步形成"],
  },
  {
    no: "05",
    kicker: "LEARNING RADAR",
    title: "学习雷达：找到真正卡住的地方",
    lead: "同一道错题背后，可能是知识、方法、表达或情绪问题。",
    copy: "学习雷达把错因、薄弱知识点、学习行为和进步趋势连接起来，帮助老师、学生与家长讨论同一个真实问题。",
    icon: BrainCircuit,
    tone: "mist",
    detail: ["知识点缺口", "方法与步骤", "复习与反馈习惯"],
  },
  {
    no: "06",
    kicker: "ASKWISE｜问思",
    title: "让每一次提问都留下成长证据",
    lead: "提问 → 协作 → 错因 → 方法 → 再验证。",
    copy: "ASKWISE 是学习支持层。它不替学生完成答案，而是让思考过程被看见、被反馈、被修正，并重新回到学习雷达。",
    icon: BookOpenCheck,
    tone: "paper",
    loop: ["提出问题", "AI 协作", "识别错因", "调整方法", "再次验证"],
  },
  {
    no: "07",
    kicker: "PHOENIX ACADEMIC STUDIO",
    title: "凤启学苑：把诊断交给真实的人",
    lead: "专业导师承接判断，以一对一支持陪伴关键阶段。",
    copy: "当家庭需要更深入的教育支持，凤启学苑将诊断结果转化为教学重点、阶段目标、作业反馈与复盘节奏，让服务围绕孩子而不是围绕课程表展开。",
    icon: GraduationCap,
    tone: "warm",
    detail: ["一对一学科支持", "阶段目标与复盘", "家校沟通与顾问协同"],
  },
  {
    no: "08",
    kicker: "GROWTH BLUEPRINT → FAMILY OS",
    title: "最终形成一条家庭可以共同走的路",
    lead: "从一次判断，走向长期的家庭成长系统。",
    copy: "Growth Blueprint 将目标、行动、负责人、证据与复盘时间写清楚；Phoenix Family OS 则持续承接家庭档案、孩子成长、重要节点与下一步决定。",
    icon: Route,
    tone: "final",
    detail: ["方向与优先级", "行动与责任人", "时间线与复盘证据"],
  },
];

export default function GuestChildPage() {
  return (
    <main className="child-scroll-page">
      <header className="child-scroll-topbar">
        <Link href="/dongfang-qijing"><ArrowLeft />返回东方启境</Link>
        <div><small>GUEST MODE · PATH 01</small><strong>为孩子寻找方向</strong></div>
        <span>DEMO · ANONYMIZED</span>
      </header>

      <section className="child-scroll-hero" aria-labelledby="child-scroll-title">
        <p>PHOENIX NOVA · FAMILY GROWTH JOURNEY</p>
        <h1 id="child-scroll-title">先理解孩子，<br /><span>再决定下一步。</span></h1>
        <strong>这不是一份仓促的答案，而是一条从困惑走向方向、从判断走向持续成长的路。</strong>
        <a href="#journey" className="child-scroll-start">展开成长长卷<ArrowRight /></a>
        <div className="child-scroll-compass" aria-hidden="true"><i /><i /><i /><i /><b /></div>
      </section>

      <section className="child-scroll-journey" id="journey" aria-label="家庭成长完整长卷">
        <div className="child-scroll-thread" aria-hidden="true" />
        {journey.map((chapter) => {
          const Icon = chapter.icon;
          return (
            <article className={`child-chapter child-chapter-${chapter.tone}`} key={chapter.no}>
              <div className="child-chapter-number"><span>{chapter.no}</span><i /></div>
              <div className="child-chapter-card">
                <header>
                  <div className="child-chapter-icon"><Icon /></div>
                  <div><small>{chapter.kicker}</small><h2>{chapter.title}</h2></div>
                </header>
                <strong>{chapter.lead}</strong>
                <p>{chapter.copy}</p>
                {chapter.detail && (
                  <ul>{chapter.detail.map((item) => <li key={item}>{item}</li>)}</ul>
                )}
                {chapter.signal && (
                  <div className="child-signal-grid">
                    {chapter.signal.map((item) => (
                      <div key={item.label}><span>{item.label}<b>{item.value}</b></span><i><em style={{ width: `${item.value}%` }} /></i></div>
                    ))}
                  </div>
                )}
                {chapter.loop && (
                  <div className="child-loop">
                    {chapter.loop.map((item, index) => <span key={item}><b>{index + 1}</b>{item}</span>)}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className="child-scroll-ending" aria-labelledby="child-ending-title">
        <p>NEXT BEST ACTION</p>
        <h2 id="child-ending-title">此刻，不必一次决定所有事情。</h2>
        <span>你只需要选择最适合家庭现在状态的下一步。</span>
        <div>
          <button type="button">进一步了解</button>
          <button type="button">查看脱敏样本</button>
          <Link href="/dongfang-qijing">暂时观察</Link>
        </div>
      </section>
    </main>
  );
}
