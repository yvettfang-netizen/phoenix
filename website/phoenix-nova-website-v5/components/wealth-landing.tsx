/* eslint-disable @next/next/no-img-element -- serve existing editorial assets directly from the Worker */
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Globe2,
  TrendingUp,
  UsersRound,
  ShieldCheck,
  Sprout,
  Layers3,
  Landmark,
  Compass,
  Check,
  FolderOpen,
  Route,
  Handshake,
  LockKeyhole,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "./v5-site";
import {
  wealthServices,
  wealthRegions,
  wealthFaqs,
  wealthDimensions,
  pick,
} from "@/lib/wealth-content";
import {
  WealthExplorer,
  WealthTools,
  WealthConsultation,
} from "./wealth-interactions";
import { MAIN_SITE_ORIGIN } from "@/lib/wealth-surface";
import styles from "./wealth.module.css";

export function WealthFrame({
  locale,
  path = "",
  standalone = false,
  children,
}: {
  standalone?: boolean;
  locale: "zh" | "en";
  path?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={styles.page}
      lang={locale === "zh" ? "zh-Hans" : "en"}
      data-wealth-page
    >
      <a className={styles.skip} href="#wealth-main">
        {locale === "zh" ? "跳至主要内容" : "Skip to main content"}
      </a>
      <SiteHeader
        locale={locale}
        page="wealth"
        appearance="v3"
        localePath={standalone ? path : `/wealth${path}`}
        mainOrigin={standalone ? MAIN_SITE_ORIGIN : undefined}
      />
      <main id="wealth-main">{children}</main>
      <SiteFooter
        locale={locale}
        appearance="v3"
        consultationPath={standalone ? "#consultation" : "/wealth#consultation"}
        mainOrigin={standalone ? MAIN_SITE_ORIGIN : undefined}
      />
    </div>
  );
}

export function WealthCompassArt() {
  return (
    <div className={styles.compassArt} aria-hidden="true">
      <div className={styles.compassRing}>
        <span>N</span>
        <span>E</span>
        <span>S</span>
        <span>W</span>
        <svg viewBox="0 0 240 240">
          <circle
            cx="120"
            cy="120"
            r="98"
            fill="none"
            stroke="currentColor"
            strokeWidth=".5"
          />
          {Array.from({ length: 36 }, (_, i) => (
            <path
              key={i}
              d="M120 17v7"
              stroke="currentColor"
              strokeWidth={i % 3 === 0 ? 2 : 0.6}
              transform={`rotate(${i * 10} 120 120)`}
            />
          ))}
          <path
            d="m120 31 19 70 70 19-70 19-19 70-19-70-70-19 70-19Z"
            fill="#d3c1a5"
          />
          <path
            d="m120 31 0 89 19-19Zm89 89h-89l19 19Zm-89 89v-89l-19 19Zm-89-89h89l-19-19Z"
            fill="#a77b4a"
          />
          <path
            d="m164 76-29 44 29 44-44-29-44 29 29-44-29-44 44 29Z"
            fill="#e8dfd1"
            stroke="#b79b75"
            strokeWidth=".8"
          />
          <circle cx="120" cy="120" r="8" fill="#a77b4a" />
        </svg>
      </div>
      <small>PHOENIX WEALTH COMPASS™</small>
    </div>
  );
}

export function WealthLanding({
  locale,
  standalone = false,
}: {
  standalone?: boolean;
  locale: "zh" | "en";
}) {
  const zh = locale === "zh",
    t = (a: string, b: string) => (zh ? a : b),
    p = (copy: readonly [string, string]) => pick(copy, locale);
  const root = standalone ? `/${locale}` : `/${locale}/wealth`,
    assessment = `${root}/${standalone ? "compass" : "assessment"}`;
  const values = [
    [
      Globe2,
      "全球视野",
      "Global perspective",
      "了解不同地区的家庭财富环境及跨境安排。",
      "Understand family wealth environments and cross-border arrangements.",
    ],
    [
      TrendingUp,
      "稳健增值",
      "Long-term resilience",
      "关注长期财富目标、资产结构及风险管理。",
      "Focus on long-term goals, asset structure and risk management.",
    ],
    [
      UsersRound,
      "家族传承",
      "Family legacy",
      "围绕家庭成员、代际关系及长期安排，建立财富传承思路。",
      "Connect family roles, generations and long-term succession planning.",
    ],
    [
      ShieldCheck,
      "风险保障",
      "Risk protection",
      "梳理家庭保障需求，了解保险及其他风险管理工具。",
      "Understand protection needs, insurance and other risk management tools.",
    ],
    [
      Sprout,
      "长期发展",
      "Lifelong growth",
      "结合教育、身份、事业及家庭人生阶段，形成长期规划。",
      "Bring education, identity, careers and life stages into a shared plan.",
    ],
  ] as const;
  const icons = [Layers3, TrendingUp, ShieldCheck, UsersRound, Globe2];
  const heading = (no: string, label: string, title: string, body?: string) => (
    <div className={styles.heading}>
      <p>
        <span>{no}</span> / {label}
      </p>
      <h2>{title}</h2>
      {body && <div className={styles.lead}>{body}</div>}
    </div>
  );
  return (
    <WealthFrame locale={locale} standalone={standalone}>
      <section
        className={styles.hero}
        aria-labelledby="wealth-title"
        data-wealth-section="hero"
      >
        <img
          className={styles.heroImage}
          src="/images/wealth-v3/family-harbour.png"
          alt={t(
            "多代家庭在温暖的居家空间眺望香港海港，情景示意图",
            "Illustrative multigenerational family overlooking Hong Kong harbour at home",
          )}
          fetchPriority="high"
          width="1536"
          height="1024"
        />
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>
            WEALTH <span /> GLOBAL FAMILY WEALTH PLANNING
          </p>
          <p className={styles.brandline}>
            {t(
              "凤启环球 · 财富规划与传承中心",
              "Phoenix Nova™ · Wealth Planning & Legacy",
            )}
          </p>
          <h1 id="wealth-title">
            {t("全球财富规划", "Global Wealth\nPlanning")}
          </h1>
          <h2>
            {t(
              "守护当下，传承未来。",
              "Preserve Today,\nCreate a Lasting Tomorrow.",
            )}
          </h2>
          <p>
            {t(
              "凤启环球以家庭为核心，结合全球视野与专业资源，关注家庭财富结构、风险保障、长期安排及家族传承。",
              "With families at its heart, Phoenix Nova brings a global perspective and professional resources to wealth structure, risk protection, long-term arrangements and family legacy.",
            )}
          </p>
          <p>
            {t(
              "从家庭财富目标梳理，到跨境资产安排与专业机构协作，帮助家庭提前看见未来需求，建立更稳健、更灵活、可持续的财富规划思路。",
              "From clarifying family goals to cross-border arrangements and professional collaboration, we help families anticipate future needs and develop resilient, flexible and sustainable planning perspectives.",
            )}
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href={assessment}>
              {t("开始财富规划", "Start your wealth plan")}
              <ArrowRight size={16} />
            </Link>
            <a className={styles.secondary} href="#wealth-compass">
              {t("了解 Wealth Compass", "Explore Wealth Compass")}
              <ArrowUpRight size={16} />
            </a>
          </div>
          <div className={styles.heroNote}>
            <span />
            {t(
              "以家庭为本 · 以长期为方向",
              "Family first. A longer perspective.",
            )}
          </div>
        </div>
        <div className={styles.heroCaption}>
          {t(
            "让财富更有方向，\n让传承更有秩序。",
            "A clearer direction for wealth.\nContinuity across generations.",
          )}
        </div>
      </section>
      <nav
        className={styles.sectionNav}
        aria-label={t("财富页面栏目", "Wealth page sections")}
      >
        <div className={styles.wrap}>
          <span>
            <Compass size={18} /> {t("财富规划", "WEALTH COMPASS")}
          </span>
          {[
            ["services", "核心服务", "Services"],
            ["wealth-compass", "家庭财富罗盘", "Compass"],
            ["tools", "规划工具", "Tools"],
            ["global", "全球视野", "Global perspectives"],
            ["knowledge", "知识中心", "Knowledge"],
            ["consultation", "咨询预约", "Consultation"],
          ].map(([id, a, b]) => (
            <a key={id} href={`#${id}`}>
              {t(a, b)}
            </a>
          ))}
        </div>
      </nav>
      <section
        className={`${styles.section} ${styles.values}`}
        data-wealth-section="values"
      >
        <div className={styles.wrap}>
          {heading(
            "02",
            t("财富核心价值", "OUR PERSPECTIVE"),
            t(
              "财富的意义，始终回到家庭。",
              "The meaning of wealth begins with family.",
            ),
          )}
          <div className={styles.valueGrid}>
            {values.map(([Icon, a, b, c, d], i) => (
              <article key={a}>
                <Icon strokeWidth={1.3} />
                <small>0{i + 1}</small>
                <h3>{t(a, b)}</h3>
                <p>{t(c, d)}</p>
              </article>
            ))}
          </div>
          <p className={styles.footnote}>
            {t(
              "稳健增值着眼长期规划与风险管理，不承诺投资收益。",
              "Our long-term perspective concerns planning and risk management. Investment returns are not promised.",
            )}
          </p>
        </div>
      </section>
      <section
        id="services"
        className={styles.section}
        data-wealth-section="services"
      >
        <div className={styles.wrap}>
          {heading(
            "03",
            t("核心业务服务", "FAMILY WEALTH SERVICES"),
            t(
              "一站式家庭财富规划服务",
              "A connected approach to family wealth",
            ),
            t(
              "围绕家庭的全生命周期需求，提供多元、专业、长期的财富规划支持。",
              "Diverse, thoughtful planning support around your family's changing needs, through every stage of life.",
            ),
          )}
          <div className={styles.serviceGrid}>
            {wealthServices.map((s, i) => {
              const Icon = icons[i];
              return (
                <article
                  className={styles.service}
                  key={s.slug}
                  data-testid="wealth-service"
                >
                  <Icon size={34} strokeWidth={1.2} />
                  <span className={styles.cardNo}>0{i + 1}</span>
                  <h3>{p(s.title)}</h3>
                  <p>{p(s.intro)}</p>
                  <details>
                    <summary>
                      {t("服务范围", "Explore scope")}
                      <span>+</span>
                    </summary>
                    <ul>
                      {s.items.map((x) => (
                        <li key={x[1]}>{p(x)}</li>
                      ))}
                    </ul>
                  </details>
                  <Link
                    href={`${root}/services/${s.slug}`}
                    aria-label={`${p(s.title)} — ${t("查看详情", "View details")}`}
                    className={styles.circleArrow}
                  >
                    <ArrowUpRight size={17} />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section
        id="wealth-compass"
        className={`${styles.section} ${styles.compassSection}`}
        data-wealth-section="compass"
      >
        <div className={styles.wrap}>
          <div className={styles.compassLayout}>
            <WealthCompassArt />
            <div>
              {heading(
                "04",
                "PHOENIX WEALTH COMPASS™",
                t("家庭财富罗盘", "A clearer picture. A considered next step."),
                t(
                  "面向家庭的中立财富结构评估与决策支持工具。帮助您了解规划的清晰程度，识别优先关注的问题。",
                  "A neutral family wealth structure assessment and decision support tool. Understand how clear your arrangements are and identify what deserves attention.",
                ),
              )}
              <div className={styles.dimensionGrid}>
                {wealthDimensions.map((d) => (
                  <div key={d.code}>
                    <span>{d.code}</span>
                    <h3>{p(d.name)}</h3>
                    <p>{p(d.description)}</p>
                  </div>
                ))}
              </div>
              <div className={styles.actions}>
                <Link className={styles.primary} href={assessment}>
                  {t("开始 14 题财富评估", "Start the 14-question assessment")}
                  <ArrowRight size={16} />
                </Link>
                <span className={styles.meta}>
                  {t(
                    "六个维度 · 可以暂不回答",
                    "Six dimensions · Skipping is welcome",
                  )}
                </span>
              </div>
              <p className={styles.footnote}>
                {t(
                  "由凤启环球独立提供，不属于智富家办，也不是保险、基金、信托或投资产品销售工具。",
                  "Independently provided by Phoenix Nova. It is not part of WisWealthy or a sales tool for insurance, funds, trusts or investments.",
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
      <section
        id="tools"
        className={styles.section}
        data-wealth-section="tools"
      >
        <div className={styles.wrap}>
          {heading(
            "05",
            t("工具与解决方案", "PLANNING TOOLKIT"),
            t(
              "把未来的问题，变成今天的准备。",
              "Turn tomorrow's questions into today's preparation.",
            ),
            t(
              "从一张清单、一次家庭对话开始，让规划更具体。",
              "Begin with a checklist and a family conversation. Give your plan a practical starting point.",
            ),
          )}
          <WealthTools locale={locale} standalone={standalone} />
        </div>
      </section>
      <section
        id="global"
        className={`${styles.section} ${styles.tinted}`}
        data-wealth-section="global"
      >
        <div className={styles.wrap}>
          {heading(
            "06",
            t("全球财富视野", "A WORLD OF PERSPECTIVES"),
            t("立足家庭，看见全球。", "Rooted in family. Open to the world."),
            t(
              "按地区与主题，寻找适合家庭当前阶段的知识与规划问题。",
              "Explore planning questions and knowledge by region and topic, in the context of your family's stage.",
            ),
          )}
          <div className={styles.regionGrid}>
            {wealthRegions.map((r) => (
              <Link
                key={r.slug}
                href={`${root}/regions/${r.slug}`}
                className={styles.regionCard}
              >
                <div className={styles.regionImage}>
                  <img
                    src={r.image}
                    alt=""
                    width="640"
                    height="400"
                    loading="lazy"
                  />
                </div>
                <div>
                  <Globe2 size={20} />
                  <h3>{p(r.name)}</h3>
                  <ArrowUpRight size={17} />
                </div>
                <p>{p(r.intro)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section
        id="knowledge"
        className={styles.section}
        data-wealth-section="knowledge"
      >
        <div className={styles.wrap}>
          {heading(
            "07",
            t("财富知识中心", "WEALTH GEO KNOWLEDGE"),
            t(
              "让每一次选择，多一份理解。",
              "A little more understanding for every decision.",
            ),
            t(
              "从家庭目标到代际传承，以清晰的知识连接规划与行动。",
              "Clear educational perspectives, connecting goals, planning and action across generations.",
            ),
          )}
          <WealthExplorer locale={locale} standalone={standalone} />
          <div className={styles.editorNote}>
            <LockKeyhole size={17} />
            <p>
              {t(
                "本中心提供一般规划知识。地区制度、税务及法律适用情况，须由具备相应资质的专业人士结合家庭事实核实。",
                "This centre offers general planning education. Qualified professionals must verify regional rules, tax and legal applicability against your family's circumstances.",
              )}
            </p>
          </div>
        </div>
      </section>
      <section
        id="growth-map"
        className={`${styles.section} ${styles.growth}`}
        data-wealth-section="growth"
      >
        <div className={styles.wrap}>
          {heading(
            "08",
            t("家庭财富成长地图", "YOUR FAMILY'S LONG VIEW"),
            t(
              "不同的人生阶段，同一份长期关怀。",
              "A shared direction through life's changing chapters.",
            ),
          )}
          <div className={styles.journey}>
            {[
              [
                "01",
                "建立基础",
                "Build foundations",
                "梳理家庭目标、成员角色与日常应急准备。",
                "Clarify shared goals, family roles and emergency preparation.",
              ],
              [
                "02",
                "稳步成长",
                "Grow with intention",
                "联系子女教育、事业发展与家庭长期支出。",
                "Connect education, careers and long-term family commitments.",
              ],
              [
                "03",
                "全球布局",
                "Connect across borders",
                "核对身份、居住地及跨境安排的相互关系。",
                "Review how identity, residence and cross-border arrangements connect.",
              ],
              [
                "04",
                "代际传承",
                "Carry your legacy forward",
                "建立资料索引、备用联系人与长期复核习惯。",
                "Create information indexes, backup contacts and regular reviews.",
              ],
            ].map(([n, a, b, c, d]) => (
              <article key={n}>
                <span>{n}</span>
                <h3>{t(a, b)}</h3>
                <p>{t(c, d)}</p>
              </article>
            ))}
          </div>
          <div className={styles.connections}>
            {[
              ["education", "教育", "Education"],
              ["identity", "身份", "Identity"],
              ["health", "健康", "Health"],
            ].map(([id, a, b]) => (
              <Link
                href={`${standalone ? MAIN_SITE_ORIGIN : ""}/${locale}/${id}`}
                key={id}
              >
                {t(a, b)}
                <ArrowUpRight size={14} />
              </Link>
            ))}
            <span>
              {t("让家庭规划相互衔接", "Keep your family's plans connected")}
            </span>
          </div>
        </div>
      </section>
      <section
        id="family-os"
        className={styles.familySection}
        data-wealth-section="family-os"
      >
        <div className={`${styles.wrap} ${styles.familyLayout}`}>
          <div>
            {heading(
              "09",
              "PHOENIX FAMILY OS™",
              t(
                "把规划，带进家庭日常。",
                "Bring your plan into everyday family life.",
              ),
              t(
                "连接家庭目标、规划进度、关键资料与长期复核，让每次讨论都有清晰的下一步。",
                "Connect goals, planning progress, essential information and regular reviews, with a clear next step after every conversation.",
              ),
            )}
            <div className={styles.familyChecks}>
              {[
                t("家庭档案", "Family profile"),
                t("规划进度", "Planning progress"),
                t("文件整理", "Document organisation"),
                t("长期追踪", "Long-term review"),
              ].map((x) => (
                <span key={x}>
                  <Check size={16} />
                  {x}
                </span>
              ))}
            </div>
            <Link
              className={styles.primary}
              href={`${standalone ? MAIN_SITE_ORIGIN : ""}/${locale}/family-center`}
            >
              {t("了解家庭中心", "Explore Family Center")}
              <ArrowRight size={16} />
            </Link>
            <p className={styles.footnote}>
              {t(
                "家庭中心为受控预览。测评不会自动建立家庭档案；长期记录与资料共享须另行授权。",
                "Family Center is a controlled preview. Assessments do not automatically create family records. Longitudinal records and sharing require separate authorisation.",
              )}
            </p>
          </div>
          <div className={styles.familyVisual}>
            <div className={styles.dashboardTop}>
              <span>Family OS</span>
              <LockKeyhole size={16} />
            </div>
            <p>
              {t(
                "一家人的未来，\n一步一步，更清晰。",
                "Your family's future.\nClearer, step by step.",
              )}
            </p>
            <div className={styles.dashboardTiles}>
              {[
                [FolderOpen, t("家庭档案", "Family")],
                [Route, t("规划进度", "Progress")],
                [Landmark, t("资料索引", "Records")],
                [Sprout, t("长期追踪", "Review")],
              ].map(([Icon, label], i) => {
                const I = Icon as typeof FolderOpen;
                return (
                  <div key={i}>
                    <I size={23} strokeWidth={1.2} />
                    <span>{label as string}</span>
                  </div>
                );
              })}
            </div>
            <small>
              {t(
                "家庭中心功能示意 · 非真实家庭数据",
                "Illustrative interface · No real family data",
              )}
            </small>
          </div>
        </div>
      </section>
      <section
        id="professionals"
        className={styles.section}
        data-wealth-section="professionals"
      >
        <div className={styles.wrap}>
          {heading(
            "10",
            t("专业协作", "PROFESSIONAL COLLABORATION"),
            t(
              "合适的问题，交给合适的专业人士。",
              "The right question. The right expertise.",
            ),
            t(
              "从厘清需要出发，按家庭意愿与授权，探索专业协作的可能。",
              "Start by clarifying your needs, then explore professional collaboration according to your preferences and permissions.",
            ),
          )}
          <div className={styles.partnerGrid}>
            {[
              [
                Handshake,
                "独立需求梳理",
                "Independent needs review",
                "从家庭目标出发，不以特定产品或机构为默认答案。",
                "Begin with family goals, without a default product or institution.",
              ],
              [
                ShieldCheck,
                "逐次确认授权",
                "Specific authorisation",
                "共享前确认机构全名、具体目的与字段清单，由您自主选择。",
                "Confirm the institution, purpose and selected fields before choosing whether to share.",
              ],
              [
                Landmark,
                "专业责任清晰",
                "Clear professional responsibility",
                "实际服务由相应机构另行说明、签约、收费并承担责任。",
                "The relevant institution separately explains, contracts, charges for and takes responsibility for its services.",
              ],
            ].map(([Icon, a, b, c, d]) => {
              const I = Icon as typeof Handshake;
              return (
                <article key={a as string}>
                  <I size={30} strokeWidth={1.2} />
                  <h3>{t(a as string, b as string)}</h3>
                  <p>{t(c as string, d as string)}</p>
                </article>
              );
            })}
          </div>
          <a href="#consultation" className={styles.textLink}>
            {t("了解专业协作流程", "Understand the collaboration process")}
            <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
      <section
        id="faq"
        className={`${styles.section} ${styles.faqSection}`}
        data-wealth-section="faq"
      >
        <div className={`${styles.wrap} ${styles.faqLayout}`}>
          {heading(
            "11",
            t("常见问题", "QUESTIONS, ANSWERED"),
            t(
              "开始之前，\n您可能想了解。",
              "Before you begin,\na little clarity.",
            ),
          )}
          <div className={styles.faqs}>
            {wealthFaqs.map((f) => (
              <details key={f.question[1]}>
                <summary>
                  {p(f.question)}
                  <span>+</span>
                </summary>
                <p>{p(f.answer)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section
        id="consultation"
        className={styles.consultationSection}
        data-wealth-section="consultation"
      >
        <div className={`${styles.wrap} ${styles.consultationLayout}`}>
          <div>
            {heading(
              "12",
              t("咨询与预约", "START A CONVERSATION"),
              t(
                "下一步，从一次家庭对话开始。",
                "Your next chapter begins with a conversation.",
              ),
              t(
                "先选择希望讨论的方向，整理您想问的问题。您无需先提交精确资产、保单或家庭成员资料。",
                "Choose a direction and prepare your questions. You do not need to provide exact assets, policies or family members' details.",
              ),
            )}
            <p className={styles.meta}>
              {t(
                "尊重意愿 · 独立授权 · 专业协作",
                "Your choice · Specific consent · Professional collaboration",
              )}
            </p>
          </div>
          <WealthConsultation locale={locale} />
        </div>
      </section>
    </WealthFrame>
  );
}
