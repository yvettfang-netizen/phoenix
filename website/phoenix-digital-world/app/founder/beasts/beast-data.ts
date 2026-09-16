export type BeastConfig = {
  slug: string;
  no: string;
  name: string;
  en: string;
  title: string;
  motto: string;
  mission: string;
  accent: string;
  soft: string;
  validated: boolean;
  projects: Array<{ name: string; role: string; status: string }>;
  actions: Array<{ level: string; text: string; state: string }>;
  evidence: Array<{ title: string; meta: string }>;
  handoffs: Array<{ from: string; to: string; text: string }>;
};

export const beastConfigs: BeastConfig[] = [
  {
    slug: "xuanwu", no: "02", name: "玄武", en: "XUANWU", title: "工程、系统、安全与技术中控", motto: "守边界，筑系统。",
    mission: "把已授权的 Phoenix 目标转化为可靠、可验收、可回滚的工程系统，并守住代码、权限、数据与部署边界。",
    accent: "#667f89", soft: "#e7eeef", validated: true,
    projects: [
      { name: "Education Compass × ASKWise", role: "Engineering Lead", status: "P0 · GATE" },
      { name: "Phoenix Nova Website V4.0", role: "Implementation", status: "VISUAL REVIEW" },
      { name: "NOVA DIGITAL V0.1", role: "Foundation", status: "WAITING HANDOFF" },
    ],
    actions: [
      { level: "P0", text: "完成 Compass 接口端到端验收证据", state: "进行中" },
      { level: "P1", text: "核对 GitHub 实际分支与最新 Commit", state: "待核验" },
      { level: "P2", text: "准备后日开发站与服务器配置清单", state: "备忘" },
    ],
    evidence: [
      { title: "Task Card / Handoff 模板 V1.2", meta: "manual · updated today" },
      { title: "接口验收证据包", meta: "waiting sync · owner Jimson" },
      { title: "工程边界记录", meta: "verified · 6 checks" },
    ],
    handoffs: [
      { from: "凤凰", to: "玄武", text: "确认今日唯一 P0 与停止线" },
      { from: "朱雀", to: "玄武", text: "交付视觉 Gate 与响应式规则" },
      { from: "玄武", to: "白泽", text: "提交测试证据与边界核验" },
    ],
  },
  {
    slug: "aoyu", no: "06", name: "鳌鱼", en: "AOYU", title: "学习支持、学习雷达与 ASKWise", motto: "问而有思，学而有迹。",
    mission: "看见学生真实的学习过程，把提问、错因、方法与再验证连接成持续成长的证据链。",
    accent: "#5f9188", soft: "#e4f0ec", validated: true,
    projects: [
      { name: "ASKWISE Learning Support Layer", role: "Learning Logic", status: "PILOT LIVE" },
      { name: "Education Compass", role: "Growth Signals", status: "INTEGRATION" },
      { name: "David 13-Day Pilot", role: "Student Growth", status: "REVIEW" },
    ],
    actions: [
      { level: "P0", text: "核对 ASKWise 六场景与 Compass 信号映射", state: "进行中" },
      { level: "P1", text: "整理学习雷达最新错因证据", state: "待提交" },
      { level: "P2", text: "更新下一轮再验证问题", state: "准备中" },
    ],
    evidence: [
      { title: "ASKWISE V1 场景 1–6", meta: "passed · mock adapter" },
      { title: "学习雷达样本", meta: "anonymized · updated today" },
      { title: "Pilot 复盘记录", meta: "manual · advisor reviewed" },
    ],
    handoffs: [
      { from: "麒麟", to: "鳌鱼", text: "交付学生目标与导师判断" },
      { from: "鳌鱼", to: "玄武", text: "提交学习逻辑与接口字段" },
      { from: "鳌鱼", to: "白泽", text: "申请事实与教育风险核验" },
    ],
  },
  {
    slug: "zhuque", no: "01", name: "朱雀", en: "ZHUQUE", title: "Zhuque Visual Studio｜朱雀视觉院", motto: "以美立序，以光传意。",
    mission: "建立 Phoenix Nova 一致、高级而有温度的视觉语言，把理念转化为可感知、可实现、可验收的体验。",
    accent: "#b87872", soft: "#f4e8e4", validated: true,
    projects: [
      { name: "凤启东方 V0.1", role: "Visual Direction", status: "GATE 2" },
      { name: "Website V4.0", role: "Visual Acceptance", status: "REVIEW" },
      { name: "Phoenix Agent System", role: "Concept Masters", status: "IN PROGRESS" },
    ],
    actions: [
      { level: "P0", text: "验收三套关键内页的凤启视觉一致性", state: "进行中" },
      { level: "P1", text: "统一九兽局部识别色与空间模板", state: "待确认" },
      { level: "P2", text: "归档概念母稿与正式资产边界", state: "准备中" },
    ],
    evidence: [
      { title: "三套关键内页 V2", meta: "visual gate · updated today" },
      { title: "Official Logo System V1.0", meta: "locked · source asset" },
      { title: "九兽概念母稿记录", meta: "concept only · not final" },
    ],
    handoffs: [
      { from: "凤凰", to: "朱雀", text: "确认品牌判断与视觉优先级" },
      { from: "朱雀", to: "玄武", text: "交付组件、色彩与响应式规则" },
      { from: "朱雀", to: "青鸾", text: "交付可传播的视觉资产规范" },
    ],
  },
  {
    slug: "baize", no: "03", name: "白泽", en: "BAIZE", title: "研究、知识、事实核验、规则与审核", motto: "知其源，守其真。",
    mission: "让每一项重要判断都有来源、证据、版本与边界。", accent: "#918878", soft: "#eeeae2", validated: false,
    projects: [], actions: [], evidence: [], handoffs: [],
  },
  {
    slug: "qingluan", no: "04", name: "青鸾", en: "QINGLUAN", title: "内容、传播、表达、排期与分发", motto: "让知识抵达，让表达生长。",
    mission: "把被确认的知识转化为清晰、可信、可持续传播的内容。", accent: "#7895a3", soft: "#e6edf0", validated: false,
    projects: [], actions: [], evidence: [], handoffs: [],
  },
  {
    slug: "qilin", no: "05", name: "麒麟", en: "QILIN", title: "教育服务、家庭成长、导师与凤启学苑", motto: "以教育陪伴长期成长。",
    mission: "连接孩子、家庭与专业导师，把教育判断转化为长期支持。", accent: "#aa8d58", soft: "#f2eadb", validated: false,
    projects: [], actions: [], evidence: [], handoffs: [],
  },
  {
    slug: "pixiu", no: "07", name: "貔貅", en: "PIXIU", title: "财富、资源、商业模型与合作判断", motto: "守其本，聚其势。",
    mission: "从长期主义出发，判断财富、资源与商业合作的真实价值。", accent: "#a37e50", soft: "#f0e7db", validated: false,
    projects: [], actions: [], evidence: [], handoffs: [],
  },
  {
    slug: "qinglong", no: "08", name: "青龙", en: "QINGLONG", title: "组织生长与全球连接", motto: "向内生长，向外连接。",
    mission: "对内建设组织、人才、Trainer System 与执行能力；对外推动全球化、市场进入、本地化与国际合作。", accent: "#5f9a8d", soft: "#e2f0eb", validated: false,
    projects: [], actions: [], evidence: [], handoffs: [],
  },
];

export const beastBySlug = Object.fromEntries(beastConfigs.map((beast) => [beast.slug, beast]));
