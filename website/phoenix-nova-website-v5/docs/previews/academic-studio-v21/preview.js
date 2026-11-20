/* Static, synthetic design preview. No network calls, session, persistence or business writes. */
const pages = [
  ["student-center", "学生学习中心", "Student Learning Center", "01"],
  ["course-detail", "课程详情", "Course Detail", "02"],
  ["student-timetable", "学生课表", "Student Timetable", "03"],
  ["parent-growth", "家长成长报告", "Parent Growth Report", "04"],
  ["teacher-workbench", "教师工作台", "Teacher Workbench", "05"],
  ["admin-workbench", "教学管理员工作台", "Teaching Admin", "06"],
];
const file = (id) => `${id}.html`;
const chip = (text, kind = "") => `<span class="chip ${kind}">${text}</span>`;
const metric = (value, label) => `<article class="panel"><div class="metric">${value}</div><p class="metric-label">${label}</p></article>`;
const row = (title, description, badge, kind = "") => `
  <div class="row"><div class="row-main"><div class="row-title">${title}</div><div class="meta">${description}</div></div>${chip(badge, kind)}</div>`;
const section = (title, note = "") => `<div class="section-head"><h2>${title}</h2><p>${note}</p></div>`;

const views = {
  "student-center": {
    eyebrow: "FAMILY OS · ACADEMIC STUDIO",
    title: "你好，演示学生 A，继续成长。",
    description: "你的课程、课表和学习证据集中在一个位置；老师确认后的课堂记录才会成为正式进度。",
    mark: "学",
    content: `
      <div class="grid four">
        ${metric("02", "本周已排课 · 演示")}
        ${metric("01", "待教师确认的课堂 · 不计入消耗")}
        ${metric("03", "已发布学习反馈 · 演示")}
        ${metric("—", "课时余额 · 待权威计费接入")}
      </div>
      ${section("继续学习", "课程与班级来自 Canonical 候选投影")}
      <div class="grid wide">
        <article class="panel">
          <h2>正在学习 ${chip("设计预览")}</h2>
          <div class="row"><div><h3>学术英语 · 高阶表达</h3><p class="meta">一对一 · 授课方式：线上 · 课程版本演示 V2</p></div><a class="button alt" href="course-detail.html">查看课程</a></div>
          <div class="progress"><span style="width:58%"></span></div>
          <div class="statline"><span>阶段目标完成度：仅为视觉示例</span><span>58% 示例</span></div>
          <div class="row" style="margin-top:20px"><div><h3>粤语表达 · 情境沟通</h3><p class="meta">小班 · 授课方式：线下 · 第二阶段</p></div>${chip("在学")}</div>
        </article>
        <article class="panel soft">
          <h2>下一节课</h2>
          <p class="eyebrow">SYNTHETIC · 仅演示</p>
          <div class="metric">周四 16:30</div>
          <p>学术英语 · 口语工作坊</p>
          <p class="meta">授课教师：演示教师 T1<br>线上课堂 · 90 分钟</p>
          <a class="button" href="student-timetable.html">查看完整课表</a>
        </article>
      </div>
      ${section("学习证据", "ASKWISE 保持独立引擎；这里只展示未来授权摘要")}
      <div class="grid two">
        <article class="panel"><h2>近期反馈</h2><div class="timeline">
          <div class="timeline-item"><strong>写作结构反馈已发布</strong><p>来源：教师课后卡 · 仅演示，正式发布须经授权。</p></div>
          <div class="timeline-item"><strong>学习任务待复盘</strong><p>来源：ASKWISE 候选摘要 · 尚未建立真实数据接线。</p></div>
        </div></article>
        <article class="panel"><h2>使用边界</h2><p class="meta">学生自读、监护人查看与教师查看是不同权限。当前页面没有真实登录、课时扣减、预约或诊断写入。</p>
          <button class="button" disabled title="设计预览，尚未接入">预约课程 · 待接入</button></article>
      </div>`
  },
  "course-detail": {
    eyebrow: "FAMILY OS · COURSE",
    title: "学术英语 · 高阶表达",
    description: "面向演示学生 A 的课程详情。课程版本、授课安排、材料与反馈分开显示，避免把预约当作实际授课。",
    mark: "课",
    content: `
      <div class="grid three">${metric("V2", "课程版本 · 示例")}${metric("1:1", "班型 · 一对一")}${metric("90′", "每次计划时长 · 示例")}</div>
      ${section("课程概览", "课程信息来自 learning.course / course_version / class")}
      <div class="grid wide">
        <article class="panel"><h2>阶段目标 ${chip("演示课程")}</h2>
          <div class="steps"><div class="step"><b>01 · 诊断</b>明确表达基础与学习目标</div><div class="step"><b>02 · 练习</b>结构化写作与观点展开</div><div class="step"><b>03 · 反馈</b>教师核验与阶段报告</div></div>
          <p class="meta" style="margin-top:18px">课程目标是教学设计，不代表考试分数提升承诺。正式课后报告只显示已发布版本。</p>
        </article>
        <article class="panel soft"><h2>教学安排</h2>
          ${row("演示教师 T1", "当前授课分配 · 需在每次读取时确认有效", "已分配")}
          ${row("授课模式", "线上 / 小班 / 线下按具体班级与课次确认", "线上")}
          ${row("课时权益", "付款、激活与余额来自独立权威事件", "未接入", "warn")}
        </article>
      </div>
      ${section("课程结构", "不把课程大纲误认为已完成课时")}
      <div class="grid three">
        <article class="panel"><p class="eyebrow">MODULE 01</p><h2>观点与证据</h2><p class="meta">用清晰论点组织材料，辨别事实与推测。</p></article>
        <article class="panel"><p class="eyebrow">MODULE 02</p><h2>跨文化表达</h2><p class="meta">在不同语境中选择准确的表达方式。</p></article>
        <article class="panel"><p class="eyebrow">MODULE 03</p><h2>成果复盘</h2><p class="meta">以教师确认与已发布报告形成可追溯反馈。</p></article>
      </div>
      <div class="grid two"><article class="panel"><h2>最近课程证据</h2>${row("演示课次 02", "排课已建立 · 教师确认待完成", "待确认", "gold")}${row("演示课次 01", "课堂事实确认后，报告才可发布", "已发布")}</article>
      <article class="panel"><h2>下一步</h2><p class="meta">打开课表查看未来安排。预约、补课和材料上传尚未接入正式 API。</p><a class="button alt" href="student-timetable.html">查看课表</a></article></div>`
  },
  "student-timetable": {
    eyebrow: "FAMILY OS · SCHEDULE",
    title: "一周课表，安排清晰可见。",
    description: "这里只展示学生有权查看的演示排课。教室、教师和学生冲突要在服务端与数据库共同校验。",
    mark: "历",
    content: `
      ${section("本周 · 合成示例", "所有时间为设计样例，不代表真实预约")}
      <article class="panel"><div class="week">
        <div class="day"><div class="day-label">周一</div><p class="meta">暂无课程</p></div>
        <div class="day"><div class="day-label">周二</div><div class="slot"><strong>学术英语</strong>16:30–18:00<br>线上 · 演示教师 T1</div></div>
        <div class="day"><div class="day-label">周三</div><p class="meta">暂无课程</p></div>
        <div class="day"><div class="day-label">周四</div><div class="slot gold"><strong>粤语表达</strong>15:00–16:00<br>线下 · 演示教室 R1</div></div>
        <div class="day"><div class="day-label">周五</div><p class="meta">暂无课程</p></div>
      </div></article>
      <div class="grid wide">
        <article class="panel"><h2>安排详情</h2>${row("学术英语 · 口语工作坊", "周二 16:30 · 线上 · 排课不等于课时消耗", "已排课")}${row("粤语表达 · 情境练习", "周四 15:00 · 演示教室 R1 · 需校验教室冲突", "已排课")}</article>
        <article class="panel soft"><h2>预约规则</h2><p class="meta">教师未确认授课前不扣课；取消、改期和补课保留原事件。当前设计预览不提供预约写入。</p><button class="button" disabled title="预约接口尚未批准">发起预约 · 待接入</button></article>
      </div>`
  },
  "parent-growth": {
    eyebrow: "FAMILY OS · GUARDIAN VIEW",
    title: "看见成长，也看见每条证据的来源。",
    description: "家长视图按当前监护权限和学习 Consent 控制。不同测评保持独立量表，不拼成一个虚构总分。",
    mark: "长",
    content: `
      <div class="grid three">${metric("03", "已发布阶段反馈 · 演示")}${metric("02", "已核验测评结果 · 演示")}${metric("—", "跨考试统一分 · 不提供")}</div>
      ${section("阶段报告", "仅显示授权范围内已发布版本")}
      <div class="grid wide">
        <article class="panel"><h2>本期成长观察 ${chip("演示报告")}</h2><p style="font-size:15px;line-height:1.8">演示学生 A 在论点组织和课堂表达方面积累了更多证据。下阶段聚焦观点支撑与复盘习惯。</p>
          <div class="tags"><span>来源：教师阶段报告</span><span>版本：演示 V1</span><span>状态：已发布</span></div>
        </article>
        <article class="panel soft"><h2>授权提示</h2><p class="meta">演示视图假设有效监护权限和学习用途 Consent。真实身份、到期、撤回和学生 Assent 尚待受控核验。</p>${chip("真实接入 HOLD", "warn")}</article>
      </div>
      ${section("独立测评", "CAT4 / DSE / A-Level / IELTS / JLPT / 粤语能力")}
      <div class="grid three">
        <article class="panel"><h2>IELTS · 示例</h2><div class="metric">—</div><p class="meta">量表及正式成绩待权威来源核验，不显示虚构分数。</p></article>
        <article class="panel"><h2>粤语能力 · 示例</h2><div class="metric">—</div><p class="meta">独立能力维度，不与 IELTS 换算。</p></article>
        <article class="panel"><h2>其他测评</h2><div class="tags"><span>CAT4</span><span>DSE</span><span>A-Level</span><span>JLPT</span></div><p class="meta" style="margin-top:12px">各自保留版本、来源、量表和审阅状态。</p></article>
      </div>
      ${section("成长时间线", "来源与发布日期可追溯")}
      <article class="panel"><div class="timeline"><div class="timeline-item"><strong>演示阶段报告发布</strong><p>教师报告 · 课程 01 · 发布后可见。</p></div><div class="timeline-item"><strong>演示课堂反馈</strong><p>课后卡 · 课堂确认与内容审核分开。</p></div><div class="timeline-item"><strong>ASKWISE 学习摘要候选</strong><p>独立引擎；正式同步需要来源版本和授权。</p></div></div></article>`
  },
  "teacher-workbench": {
    eyebrow: "CORPORATE OS · TEACHER",
    title: "教学现场，一次只看被分配的班级。",
    description: "教师工作台强调课堂事实确认、课后反馈和当前分配范围。没有项目分配或渠道归属推导学生私档权限。",
    mark: "师",
    content: `
      <div class="grid three">${metric("02", "今日授课安排 · 演示")}${metric("01", "待确认授课 · 演示")}${metric("02", "待提交课后卡 · 演示")}</div>
      ${section("今日安排", "仅展示有效 teacher_assignment 范围")}
      <div class="grid wide">
        <article class="panel"><h2>我的班级</h2>${row("学术英语 · 小班 A", "09:30–11:00 · 演示教室 R2 · 3 名演示学生", "待授课")}${row("粤语表达 · 一对一", "16:30–17:30 · 线上 · 演示学生 A", "待确认", "gold")}</article>
        <article class="panel soft"><h2>事实确认规则</h2><p class="meta">只有教师确认实际授课并通过例外审核，才产生可扣减的课时事实。当前无写入能力。</p><button class="button" disabled title="教师确认接口尚未接入">确认授课 · 待接入</button></article>
      </div>
      ${section("教学反馈", "草稿、提交、发布分别授权")}
      <div class="grid two"><article class="panel"><h2>课后卡队列</h2>${row("演示课次 01", "可编写反馈草稿；发布前需审核", "草稿", "gold")}${row("演示课次 02", "等待授课事实确认", "不可发布", "warn")}</article>
      <article class="panel"><h2>查看边界</h2><p class="meta">教师只能查看当前分配班级中获授权学生的学习记录。分配终止、Consent 撤回或会话失效后立即拒绝新读取。</p><div class="tags"><span>班级范围</span><span>学生范围</span><span>用途范围</span></div></article></div>`
  },
  "admin-workbench": {
    eyebrow: "CORPORATE OS · TEACHING OPERATIONS",
    title: "把排课、确认与异常放在同一视野。",
    description: "教学管理员管理经过授权的教学运营事实；财务结算与学生私档仍有独立权限边界。",
    mark: "管",
    content: `
      <div class="grid four">${metric("04", "今日演示课次")}${metric("01", "排课冲突待审")}${metric("02", "授课确认待审")}${metric("—", "结算金额 · 不在本页")}</div>
      ${section("运营队列", "演示数据；不可执行正式审批")}
      <div class="grid wide"><article class="panel"><h2>需处理</h2>
        ${row("教室资源冲突", "演示教室 R1 · 两项线下申请时间重叠", "待解决", "warn")}
        ${row("实际授课确认", "演示教师 T1 · 90 分钟 · 待核对出勤", "待审核", "gold")}
        ${row("补课申请", "需关联原课次和补偿事件，不覆盖原流水", "待规则", "warn")}
      </article><article class="panel soft"><h2>权限与审计</h2><p class="meta">管理员能力需要明确授权、有效期与撤权。所有关键动作记录操作者、来源版本和原因码；不能凭页面工作区名称升级权限。</p><button class="button" disabled title="审批接口尚未接入">处理队列 · 待接入</button></article></div>
      ${section("教学资源概览", "资源编号和冲突约束均待正式迁移")}
      <div class="grid two"><article class="panel"><h2>班型与场地</h2><div class="barset">
        <div class="bar"><span>一对一</span><span class="bar-track"><span class="bar-fill" style="width:62%"></span></span><span>演示</span></div>
        <div class="bar"><span>小班</span><span class="bar-track"><span class="bar-fill" style="width:44%"></span></span><span>演示</span></div>
        <div class="bar"><span>线上/混合</span><span class="bar-track"><span class="bar-fill" style="width:78%"></span></span><span>演示</span></div>
      </div></article><article class="panel"><h2>结算证据</h2><p class="meta">教师结算仅引用已确认课次和批准的费率版本。付款执行在权威财务系统；本预览不展示金额，不提供结算按钮。</p>${chip("权威接口 HOLD", "warn")}</article></div>`
  }
};

const viewId = document.body.dataset.view;
const view = views[viewId];
if (!view) throw new Error("Unknown static preview page");
const current = pages.find(([id]) => id === viewId);
document.title = `${current[1]}｜Phoenix Academic Studio V2.1 设计预览`;
document.getElementById("app").innerHTML = `
  <a class="skip" href="#main">跳至主内容</a>
  <div class="app">
    <aside class="sidebar">
      <a class="brand-card" href="index.html" aria-label="Phoenix Nova 学苑设计预览首页">
        <img src="../../../public/brand/official/v3/phoenix-nova-header@2x.png" alt="Phoenix Nova 官方标志">
        <span>凤启学苑 · Academic Studio</span>
      </a>
      <div><p class="sidebar-eyebrow">V2.1 · SIX PREVIEWS</p><nav class="side-nav" aria-label="预览页面">
        ${pages.map(([id,name,,num]) => `<a href="${file(id)}" ${id === viewId ? 'aria-current="page"' : ""}><span class="nav-num">${num}</span><span>${name}</span></a>`).join("")}
      </nav></div>
      <div class="sidebar-note"><strong>设计状态 · PROPOSED</strong>这六页仅用于 Founder P0 审查。无真实账户、课时、成绩或付款数据；业务操作尚未接线。</div>
    </aside>
    <div class="page">
      <header class="topbar"><div class="topbar-title">PHOENIX NOVA™ / ${viewId.includes("workbench") ? "CORPORATE OS" : "FAMILY OS"}</div>
        <div class="topbar-right">${chip("合成数据 · 设计预览","gold")}<span>DEMO</span><span class="avatar" aria-hidden="true">P</span></div></header>
      <main id="main" class="content">
        <div class="notice">P0 页面设计预览：内容与人物均为合成示例；无真实登录、数据库读写、预约、扣课、结算或测评结果。</div>
        <section class="hero" aria-labelledby="page-title"><div class="hero-copy"><p class="eyebrow">${view.eyebrow}</p><h1 id="page-title">${view.title}</h1><p>${view.description}</p></div><div class="hero-mark" aria-hidden="true">${view.mark}</div></section>
        ${view.content}
        <footer class="footer"><span>PHOENIX ACADEMIC STUDIO V2.1 · P0 ARCHITECTURE RESET</span><span>PROPOSED · 本地静态设计预览 · 无运行接入</span></footer>
      </main>
    </div>
  </div>`;
