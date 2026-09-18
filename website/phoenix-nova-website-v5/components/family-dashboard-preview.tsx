import Link from "next/link";

type FamilyDashboardPreviewProps = {
  full?: boolean;
  compassHref?: string;
  locale?: "zh" | "en";
};

export function FamilyDashboardPreview({ full = false, compassHref = "/zh/compass", locale = "zh" }: FamilyDashboardPreviewProps) {
  const t = (zh: string, en: string) => locale === "zh" ? zh : en;
  const members = [
    { name: t("父亲", "Father"), initial: "F", tone: "navy" },
    { name: t("母亲", "Mother"), initial: "M", tone: "gold" },
    { name: "Child A", initial: "A", tone: "sage" },
    { name: "Child B", initial: "B", tone: "mist" },
  ];

  return (
    <div className={`family-dashboard-preview ${full ? "family-dashboard-preview--full" : ""}`}>
      <div className="family-dashboard-device" aria-label={t("Phoenix Family OS 手机端预览", "Phoenix Family OS mobile preview")}>
        <div className="family-dashboard-dynamic-island" aria-hidden="true" />
        <div className="family-dashboard-screen">
          <div className="dashboard-topline">
            <span>9:41</span>
            <span className="dashboard-status" aria-hidden="true"><i /><i /><i /></span>
          </div>

          <div className="dashboard-welcome">
            <div>
              <small>FAMILY OVERVIEW</small>
              <h3>{t("我的家庭", "My Family")}</h3>
            </div>
            <span className="dashboard-notification" aria-label={t("2 项提醒", "2 reminders")}>2</span>
          </div>

          <article className="dashboard-today-card">
            <div className="today-card-title"><span>{t("今日提醒", "TODAY")}</span><small>DEMO</small></div>
            <p>{t("回乡证 · 92 天后到期", "Travel permit · 92 days")}</p>
            <div className="today-card-track"><i /></div>
            <span>{t("身份节点请以正式资料为准", "Identity dates require verified records")}</span>
          </article>

          <section className="dashboard-section">
            <div className="dashboard-section-heading"><strong>Family Members</strong><span>4</span></div>
            <div className="dashboard-members">
              {members.map((member) => (
                <div className="dashboard-member" key={member.name}>
                  <span className={`member-avatar member-avatar--${member.tone}`}>{member.initial}</span>
                  <small>{member.name}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-module-grid">
            <article className="dashboard-module dashboard-module--identity">
              <span className="module-symbol module-symbol--identity" aria-hidden="true" />
              <small>Identity Journey</small><strong>{t("香港身份", "Hong Kong Identity")}</strong><em>{t("下个节点 · 待确认", "Next milestone · Pending")}</em>
            </article>
            <article className="dashboard-module dashboard-module--education">
              <span className="module-symbol module-symbol--education" aria-hidden="true" />
              <small>Education Growth</small><strong>{t("教育成长", "Education Growth")}</strong><em>{t("学校记录 · 2 项更新", "School records · 2 updates")}</em>
            </article>
            <article className="dashboard-module dashboard-module--ai">
              <span className="module-symbol module-symbol--ai" aria-hidden="true" />
              <small>AI Companion</small><strong>{t("学习支持", "Learning Support")}</strong><em>{t("示意服务", "Illustrative service")}</em>
            </article>
            <article className="dashboard-module dashboard-module--timeline">
              <span className="module-symbol module-symbol--timeline" aria-hidden="true" />
              <small>Family Timeline</small><strong>{t("家庭时间线", "Family Timeline")}</strong><em>{t("3 个未来节点", "3 future milestones")}</em>
            </article>
          </section>

          <nav className="dashboard-bottom-nav" aria-label={t("Family OS 演示导航", "Family OS demo navigation")}>
            <span className="is-active"><i />Home</span><span><i />Family</span><span><i />Education</span><span><i />Timeline</span><span><i />AI</span>
          </nav>
        </div>
      </div>

      {!full && (
        <>
          <article className="dashboard-float dashboard-float--identity"><span>Identity Journey</span><strong>{t("让每个节点", "Keep every milestone")}<br />{t("有迹可循", "within view")}</strong><small>{t("家庭身份档案 · 演示", "Family identity records · Demo")}</small></article>
          <article className="dashboard-float dashboard-float--timeline"><span>Family Timeline</span><strong>2026.09</strong><small>{t("教育规划节点", "Education planning milestone")}</small></article>
        </>
      )}

      {full && (
        <div className="family-dashboard-full-note">
          <p>{t("这是 Phoenix Family OS™ 的产品预览。", "This is a product preview of Phoenix Family OS™.")}</p>
          <span>{t("当前 MVP 聚焦家庭档案、孩子档案、评估结果与家庭时间线，并逐步承接成长蓝图。", "The current MVP focuses on family and child profiles, assessment results and the family timeline, progressively carrying the Growth Blueprint forward.")}</span>
          <Link href={compassHref} className="text-link">{t("从家庭罗盘开始", "Begin with Family Compass")} <b aria-hidden="true">↗</b></Link>
        </div>
      )}
    </div>
  );
}
