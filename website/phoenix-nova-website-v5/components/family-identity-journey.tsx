import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  Globe,
  Plane,
  ShieldCheck,
  Users,
} from 'lucide-react';

type Locale = 'zh' | 'en';

type Copy = { zh: string; en: string };

const identityJourneyStyles = `
  .fi-journey { display: grid; gap: 18px; margin-top: 20px; }
  .fi-preview-banner { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border: 1px solid rgba(201,155,80,.45); border-radius: 14px; background: linear-gradient(120deg, rgba(255,251,239,.96), rgba(239,248,246,.88)); color: #163f43; }
  .fi-preview-banner svg { flex: 0 0 auto; color: #a8782f; margin-top: 2px; }
  .fi-preview-banner strong { display: block; font-size: 14px; }
  .fi-preview-banner span { display: block; margin-top: 3px; font-size: 12px; line-height: 1.55; color: #547073; }
  .fi-intro { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; padding: 8px 2px 2px; }
  .fi-kicker { margin: 0 0 5px; color: #a8782f; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; }
  .fi-intro h2 { margin: 0; color: #0b4851; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(24px, 3vw, 34px); line-height: 1.15; }
  .fi-intro p { max-width: 600px; margin: 8px 0 0; color: #536d70; font-size: 14px; line-height: 1.65; }
  .fi-privacy { flex: 0 0 min(280px, 38%); padding: 12px 14px; border-radius: 12px; background: #f2f7f5; color: #4e686b; font-size: 12px; line-height: 1.55; }
  .fi-privacy strong { display: block; margin-bottom: 4px; color: #0b4851; font-size: 13px; }
  .fi-members { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .fi-member, .fi-module { border: 1px solid rgba(20,82,87,.13); border-radius: 16px; background: rgba(255,255,255,.84); box-shadow: 0 8px 24px rgba(14,54,58,.05); }
  .fi-member { padding: 16px; }
  .fi-member-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
  .fi-person { display: flex; gap: 11px; align-items: center; min-width: 0; }
  .fi-person-avatar { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: #e5f0ed; color: #0b5960; }
  .fi-person strong { display: block; color: #113f45; font-size: 15px; }
  .fi-person small { display: block; margin-top: 3px; color: #7a8e90; font-size: 11px; }
  .fi-status { display: inline-flex; align-items: center; gap: 5px; padding: 5px 8px; border-radius: 999px; background: #edf6ee; color: #44734b; font-size: 11px; white-space: nowrap; }
  .fi-status.pending { background: #fff7e7; color: #926828; }
  .fi-member dl { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 16px 0 0; }
  .fi-member dt { color: #718587; font-size: 11px; }
  .fi-member dd { margin: 3px 0 0; color: #183f43; font-size: 13px; line-height: 1.45; }
  .fi-source { display: inline-flex; gap: 5px; align-items: center; margin-top: 14px; color: #8a6a37; font-size: 11px; }
  .fi-modules { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .fi-module { padding: 15px; }
  .fi-module-icon { display: grid; place-items: center; width: 34px; height: 34px; margin-bottom: 11px; border-radius: 10px; background: #eef5f3; color: #0b5960; }
  .fi-module h3 { margin: 0; color: #143f44; font-size: 14px; line-height: 1.4; }
  .fi-module p { margin: 7px 0 0; color: #637779; font-size: 12px; line-height: 1.55; }
  .fi-module-note { display: inline-block; margin-top: 10px; color: #936b2c; font-size: 11px; line-height: 1.45; }
  .fi-split { display: grid; grid-template-columns: 1.15fr .85fr; gap: 14px; }
  .fi-panel { padding: 17px; border: 1px solid rgba(20,82,87,.13); border-radius: 16px; background: rgba(255,255,255,.84); }
  .fi-panel h3 { margin: 0; color: #143f44; font-size: 16px; }
  .fi-panel-intro { margin: 6px 0 14px; color: #6a7d7f; font-size: 12px; line-height: 1.55; }
  .fi-timeline { display: grid; gap: 11px; }
  .fi-timeline-item { display: grid; grid-template-columns: 34px 1fr; gap: 10px; align-items: start; }
  .fi-timeline-mark { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #eef5f3; color: #0b5960; }
  .fi-timeline-item strong { display: block; color: #234b4f; font-size: 13px; }
  .fi-timeline-item span { display: block; margin-top: 3px; color: #758789; font-size: 11px; line-height: 1.45; }
  .fi-reminders { display: grid; gap: 9px; }
  .fi-reminder { display: flex; align-items: flex-start; gap: 8px; padding: 10px 11px; border-radius: 10px; background: #f7f5ed; color: #5f6863; font-size: 12px; line-height: 1.45; }
  .fi-reminder svg { flex: 0 0 auto; margin-top: 1px; color: #ab7a31; }
  .fi-review { padding: 16px; border: 1px solid rgba(65,132,125,.23); border-radius: 16px; background: linear-gradient(135deg, #edf6f2, #f8f8f1); }
  .fi-review h3 { margin: 0; color: #0b5960; font-size: 16px; }
  .fi-review p { margin: 7px 0 0; color: #566f70; font-size: 12px; line-height: 1.6; }
  .fi-review-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 13px; }
  .fi-review-card { padding: 11px 12px; border-radius: 11px; background: rgba(255,255,255,.75); }
  .fi-review-card strong { display: block; color: #244e51; font-size: 12px; }
  .fi-review-card span { display: block; margin-top: 4px; color: #718284; font-size: 11px; line-height: 1.45; }
  .fi-docs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .fi-doc { display: flex; align-items: flex-start; gap: 10px; padding: 13px; border: 1px solid rgba(20,82,87,.13); border-radius: 13px; background: rgba(255,255,255,.84); }
  .fi-doc svg { flex: 0 0 auto; color: #0b5960; }
  .fi-doc strong { display: block; color: #234b4f; font-size: 13px; }
  .fi-doc span { display: block; margin-top: 4px; color: #718284; font-size: 11px; line-height: 1.45; }
  .fi-link { display: inline-flex; align-items: center; gap: 5px; margin-top: 10px; color: #0b5960; font-size: 12px; text-decoration: underline; text-underline-offset: 3px; }
  .fi-link:focus-visible, .fi-journey a:focus-visible, .fi-journey summary:focus-visible { outline: 3px solid rgba(201,155,80,.52); outline-offset: 3px; border-radius: 4px; }
  @media (max-width: 900px) { .fi-intro { display: block; } .fi-privacy { max-width: none; margin-top: 12px; } .fi-modules { grid-template-columns: repeat(2, minmax(0, 1fr)); } .fi-split { grid-template-columns: 1fr; } }
  @media (max-width: 620px) { .fi-members, .fi-modules, .fi-docs, .fi-review-grid { grid-template-columns: 1fr; } .fi-member dl { grid-template-columns: 1fr 1fr; } .fi-intro h2 { font-size: 27px; } .fi-preview-banner { padding: 12px; } }
`;

const copy = (zh: string, en: string): Copy => ({ zh, en });

const people = [
  {
    name: copy('示例成员 A', 'Example member A'),
    relation: copy('家庭成员 · 主要记录', 'Family member · primary record'),
    status: copy('身份记录示例', 'Sample status record'),
    valid: copy('2028-05-31（示例）', '2028-05-31 (sample)'),
    document: copy('获准逗留期限记录', 'Permitted-stay record'),
    pending: false,
  },
  {
    name: copy('示例成员 B', 'Example member B'),
    relation: copy('家庭成员 · 受养人示例', 'Family member · dependent example'),
    status: copy('受养人期限待核验', 'Dependent period to verify'),
    valid: copy('2027-11-14（示例）', '2027-11-14 (sample)'),
    document: copy('受养人身份记录', 'Dependent status record'),
    pending: true,
  },
];

const moduleCopy: Array<{ title: Copy; body: Copy; note: Copy }> = [
  { title: copy('家庭身份档案', 'Family identity profile'), body: copy('按家庭成员分别记录身份类别、关系与已核验日期。', 'Record status type, relationship and verified dates per person.'), note: copy('不合并不同成员的期限', 'Member timelines remain separate') },
  { title: copy('证件管家', 'Document keeper'), body: copy('只展示证件类型和必要节点，不要求在此上传完整证件。', 'Show document types and key dates only; no full document upload.'), note: copy('无证件号码', 'No document numbers') },
  { title: copy('续签日历', 'Renewal calendar'), body: copy('以个案获准期限为基础，提醒窗口仍需人工核对。', 'Use case-specific permitted periods; reminder windows need human review.'), note: copy('提醒不是法定期限', 'Reminders are not legal deadlines') },
  { title: copy('出入境及回港提醒', 'Travel & return reminders'), body: copy('记录需要核对的首次入境、离港及回港事项。', 'Track first-entry, absence and return-to-Hong-Kong items to verify.'), note: copy('不自动判断资格', 'No automatic eligibility decision') },
  { title: copy('七年通常居住辅助规划', 'Seven-year ordinary residence review'), body: copy('以时间线辅助整理资料，不把累计天数直接等同通常居住。', 'Use a timeline to organize evidence; accumulated days are not ordinary residence.'), note: copy('需人工复核', 'Human review required') },
  { title: copy('护照及永久居民后续证件', 'Passport & permanent resident follow-up'), body: copy('把永久居民身份证、香港特区护照与其他旅行证件分开管理。', 'Keep permanent identity, HKSAR passport and travel documents separate.'), note: copy('条件与资格另行核验', 'Conditions and eligibility require separate review') },
];

export function FamilyIdentityJourney({ locale }: { locale: Locale }) {
  const en = locale === 'en';
  const t = (value: Copy) => (en ? value.en : value.zh);
  return (
    <>
      <style>{identityJourneyStyles}</style>
      <section className="fi-journey" aria-labelledby="family-identity-journey-title">
        <div className="fi-preview-banner" role="note">
          <ShieldCheck size={19} aria-hidden="true" />
          <div>
            <strong>{t(copy('合成场景预览 · 非个人资料', 'Synthetic scenario preview · no personal records'))}</strong>
            <span>{t(copy('本模块仅在开发演示开关与身份预览开关同时开启时显示。示例内容不保存、不上传、不创建咨询。', 'This module is shown only when both development demo and identity preview flags are enabled. Sample content is not saved, uploaded or used to create a consultation.'))}</span>
          </div>
        </div>

        <div className="fi-intro">
          <div>
            <p className="fi-kicker">{en ? 'MY IDENTITY · IDENTITY JOURNEY' : '我的身份 · IDENTITY JOURNEY'}</p>
            <h2 id="family-identity-journey-title">{t(copy('家庭身份与证件安排', 'Family identity & documents'))}</h2>
            <p>{t(copy('为每位家庭成员保留独立身份时间线，帮助家庭看清证件、续签与后续核验事项。这里是只读的界面预览，不替代入境处或专业人士的正式判断。', 'Keep an independent identity timeline for each family member so key documents, renewals and verification steps stay clear. This is a read-only interface preview, not a substitute for the Immigration Department or professional advice.'))}</p>
          </div>
          <aside className="fi-privacy">
            <strong>{t(copy('隐私边界', 'Privacy boundary'))}</strong>
            {t(copy('不上传护照、身份证或医疗资料；不保存示例数据；真实资料只可经受控身份与授权流程处理。', 'No passport, identity-card or medical-file upload; sample data is not saved. Real records require controlled identity and consent flows.'))}
          </aside>
        </div>

        <div className="fi-members" aria-label={t(copy('示例家庭成员', 'Example family members'))}>
          {people.map((person) => (
            <article className="fi-member" key={person.name.en}>
              <div className="fi-member-head">
                <div className="fi-person">
                  <span className="fi-person-avatar" aria-hidden="true"><Users size={20} /></span>
                  <div><strong>{t(person.name)}</strong><small>{t(person.relation)}</small></div>
                </div>
                <span className={`fi-status${person.pending ? ' pending' : ''}`}><Check size={13} aria-hidden="true" />{t(person.status)}</span>
              </div>
              <dl>
                <div><dt>{t(copy('独立日期', 'Independent date'))}</dt><dd>{t(person.valid)}</dd></div>
                <div><dt>{t(copy('记录类型', 'Record type'))}</dt><dd>{t(person.document)}</dd></div>
              </dl>
              <span className="fi-source"><FileText size={13} aria-hidden="true" />{t(copy('示例记录 · 未核验', 'Sample record · not verified'))}</span>
            </article>
          ))}
        </div>

        <div className="fi-modules" aria-label={t(copy('身份管理六大模块', 'Six identity management modules'))}>
          {moduleCopy.map((module, index) => {
            const Icon = [Users, FileText, CalendarDays, Plane, Clock3, ShieldCheck][index];
            return <article className="fi-module" key={module.title.en}><span className="fi-module-icon"><Icon size={18} aria-hidden="true" /></span><h3>{t(module.title)}</h3><p>{t(module.body)}</p><span className="fi-module-note">{t(module.note)}</span></article>;
          })}
        </div>

        <div className="fi-split">
          <section className="fi-panel" aria-labelledby="fi-timeline-title">
            <h3 id="fi-timeline-title">{t(copy('身份时间线（示例）', 'Identity timeline (sample)'))}</h3>
            <p className="fi-panel-intro">{t(copy('日期与状态必须按个人及家庭成员分别核对；以下内容仅用于展示布局。', 'Dates and statuses must be verified separately for each person; the entries below only demonstrate the layout.'))}</p>
            <div className="fi-timeline">
              <div className="fi-timeline-item"><span className="fi-timeline-mark"><Globe size={16} aria-hidden="true" /></span><div><strong>{t(copy('首次入境截止', 'First-entry deadline'))}</strong><span>{t(copy('2027-03-30（示例） · 待人工核验', '2027-03-30 (sample) · human verification pending'))}</span></div></div>
              <div className="fi-timeline-item"><span className="fi-timeline-mark"><CalendarDays size={16} aria-hidden="true" /></span><div><strong>{t(copy('获准逗留期限', 'Permitted period of stay'))}</strong><span>{t(copy('以个案批准文件为准 · 示例未保存', 'Subject to the individual approval document · sample not saved'))}</span></div></div>
              <div className="fi-timeline-item"><span className="fi-timeline-mark"><AlertTriangle size={16} aria-hidden="true" /></span><div><strong>{t(copy('证件更新节点', 'Document renewal checkpoint'))}</strong><span>{t(copy('受养人及保证关系需分别核对 · 资料不完整', 'Dependent and sponsor relationships require separate review · information incomplete'))}</span></div></div>
            </div>
          </section>
          <section className="fi-panel" aria-labelledby="fi-reminder-title">
            <h3 id="fi-reminder-title">{t(copy('提醒示例', 'Reminder examples'))}</h3>
            <p className="fi-panel-intro">{t(copy('以下是可配置的站内提醒示例，不代表官方申请窗口或法定期限。', 'These are configurable in-product reminder examples, not official application windows or legal deadlines.'))}</p>
            <div className="fi-reminders">
              <div className="fi-reminder"><Clock3 size={15} aria-hidden="true" />{t(copy('180天 · 建议提醒，非官方期限', '180 days · suggested reminder, not an official deadline'))}</div>
              <div className="fi-reminder"><Clock3 size={15} aria-hidden="true" />{t(copy('90天 · 示例站内提醒', '90 days · sample in-product reminder'))}</div>
              <div className="fi-reminder"><AlertTriangle size={15} aria-hidden="true" />{t(copy('首次入境及回港事项需人工核对', 'First-entry and return-to-Hong-Kong items need human review'))}</div>
            </div>
          </section>
        </div>

        <section className="fi-review" aria-labelledby="fi-review-title">
          <h3 id="fi-review-title">{t(copy('七年通常居住辅助规划', 'Seven-year ordinary residence review'))}</h3>
          <p>{t(copy('这里只整理已记录的时间线、离港区间与待核验资料；累计在港天数不能直接等同“通常居住”，也不会自动判断永久居民或护照资格。', 'This area organizes recorded timelines, absence periods and missing evidence only. Accumulated days in Hong Kong cannot be treated as ordinary residence and do not automatically determine permanent-resident or passport eligibility.'))}</p>
          <div className="fi-review-grid"><div className="fi-review-card"><strong>{t(copy('时间线状态', 'Timeline status'))}</strong><span>{t(copy('部分记录 · 待人工复核', 'Partial records · human review required'))}</span></div><div className="fi-review-card"><strong>{t(copy('资料状态', 'Information status'))}</strong><span>{t(copy('缺少离港原因及证据引用', 'Absence reasons and evidence references are missing'))}</span></div></div>
        </section>

        <section aria-labelledby="fi-docs-title">
          <div className="fi-panel" style={{ paddingBottom: 14 }}>
            <h3 id="fi-docs-title">{t(copy('永久居民与旅行证件（分开管理）', 'Permanent residence & travel documents (kept separate)'))}</h3>
            <p className="fi-panel-intro">{t(copy('这些类别不是同一个字段，相关资格与实际文件须按个人情况核验。', 'These categories are not the same field; eligibility and documents must be verified for each person.'))}</p>
            <div className="fi-docs">
              <div className="fi-doc"><ShieldCheck size={19} aria-hidden="true" /><div><strong>{t(copy('永久居民身份证', 'Permanent resident identity card'))}</strong><span>{t(copy('状态：待核验 · 不等同于获准逗留期限', 'Status: to verify · not the same as a permitted-stay period'))}</span></div></div>
              <div className="fi-doc"><FileText size={19} aria-hidden="true" /><div><strong>{t(copy('香港特别行政区护照', 'HKSAR passport'))}</strong><span>{t(copy('仅在适用的中国公民、香港永久居民及有效永久性居民身份证等条件下另行核验。', 'Verify separately only where applicable conditions for Chinese nationality, Hong Kong permanent residence and a valid permanent identity card are met.'))}</span></div></div>
            </div>
            <a className="fi-link" href="https://www.immd.gov.hk/" target="_blank" rel="noreferrer">{t(copy('查看香港入境处公开信息', 'View public information from the Hong Kong Immigration Department'))}<ArrowRight size={14} aria-hidden="true" /></a>
          </div>
        </section>
      </section>
    </>
  );
}
