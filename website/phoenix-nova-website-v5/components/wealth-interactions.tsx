"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Search,
  ClipboardList,
  Check,
  ArrowRight,
} from "lucide-react";
import { wealthArticles, wealthRegions, pick } from "@/lib/wealth-content";
import styles from "./wealth.module.css";

export function WealthExplorer({
  locale,
  standalone = false,
}: {
  locale: "zh" | "en";
  standalone?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [region, setRegion] = useState("all");
  const zh = locale === "zh",
    t = (a: string, b: string) => (zh ? a : b);
  const selectedRegion = wealthRegions.find((r) => r.slug === region);
  const articles = wealthArticles.filter(
    (a) =>
      (region === "all" || a.region === region) &&
      [pick(a.title, locale), pick(a.summary, locale), pick(a.category, locale)]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <div data-testid="wealth-explorer">
      <div className={styles.searchBar}>
        <Search size={20} />
        <label className={styles.srOnly} htmlFor="wealth-search">
          {t("检索财富知识", "Search wealth knowledge")}
        </label>
        <input
          id="wealth-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            "搜索家庭目标、风险保障、跨境安排或传承问题",
            "Search goals, protection, cross-border planning or legacy",
          )}
        />
        <label className={styles.srOnly} htmlFor="wealth-region">
          {t("地区", "Region")}
        </label>
        <select
          id="wealth-region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="all">{t("全部地区", "All regions")}</option>
          {wealthRegions.map((r) => (
            <option key={r.slug} value={r.slug}>
              {pick(r.name, locale)}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.topicChips}>
        <span>{t("热门主题", "Explore topics")}</span>
        {(zh
          ? ["家庭", "保障", "跨境", "传承"]
          : ["family", "protection", "cross-border", "legacy"]
        ).map((x) => (
          <button key={x} type="button" onClick={() => setQuery(x)}>
            {x}
          </button>
        ))}
        {(query || region !== "all") && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setRegion("all");
            }}
          >
            {t("清空筛选", "Clear filters")}
          </button>
        )}
      </div>
      {selectedRegion && (
        <div className={styles.notice}>
          <strong>{pick(selectedRegion.name, locale)}</strong>
          <p>{pick(selectedRegion.intro, locale)}</p>
          <Link
            className={styles.textLink}
            href={`${standalone ? `/${locale}` : `/${locale}/wealth`}/regions/${selectedRegion.slug}`}
          >
            {t("查看地区规划问题", "Explore regional planning questions")} ↗
          </Link>
        </div>
      )}
      <p role="status" className={styles.resultCount}>
        {t(
          `找到 ${articles.length} 篇规划知识`,
          `Showing ${articles.length} planning guides`,
        )}
      </p>
      <div className={styles.articleGrid}>
        {articles.map((a, i) => (
          <Link
            href={
              standalone
                ? `/${locale}/knowledge/${a.slug}`
                : `/${locale}/wealth/guides/${a.slug}`
            }
            key={a.slug}
            className={styles.articleCard}
          >
            <div>
              <span>{pick(a.category, locale)}</span>
              <small>0{i + 1}</small>
            </div>
            <h3>{pick(a.title, locale)}</h3>
            <p>{pick(a.summary, locale)}</p>
            <span className={styles.textLink}>
              {t("阅读规划指南", "Read the guide")}
              <ArrowUpRight size={16} />
            </span>
          </Link>
        ))}
      </div>
      {articles.length === 0 && (
        <p className={styles.empty}>
          {t(
            "暂未找到相关内容，请尝试其他关键词或清空筛选。",
            "No matching guides. Try another keyword or clear the filters.",
          )}
        </p>
      )}
    </div>
  );
}

export function WealthTools({
  locale,
  standalone = false,
}: {
  locale: "zh" | "en";
  standalone?: boolean;
}) {
  const zh = locale === "zh",
    t = (a: string, b: string) => (zh ? a : b);
  const tools = [
    {
      title: t("家庭年度规划清单", "Annual family planning checklist"),
      intro: t(
        "留出一次共同讨论的时间，让目标与行动保持一致。",
        "Make time for a shared conversation and connect goals with action.",
      ),
      items: zh
        ? [
            "确认未来一年的家庭优先事项",
            "梳理教育、居住与重大支出节点",
            "复核应急准备与责任分工",
            "约定下一次家庭回顾时间",
          ]
        : [
            "Agree on the coming year's priorities",
            "Map education, residence and major commitments",
            "Review emergency preparation and responsibilities",
            "Schedule your next family review",
          ],
    },
    {
      title: t("关键资料连续性清单", "Information continuity checklist"),
      intro: t(
        "不上传文件，也能先理清家庭需要知道什么。",
        "Clarify what your family needs to know, without uploading documents.",
      ),
      items: zh
        ? [
            "建立资料类别索引，不填写账号",
            "确认资料保管与访问权限",
            "约定一位备用联系人",
            "定期核对联络方式与行动顺序",
          ]
        : [
            "Create a category index without account details",
            "Confirm custody and access permissions",
            "Agree on a backup contact",
            "Review contact routes and the order of action",
          ],
    },
  ];
  const [checked, setChecked] = useState<string[]>([]);
  return (
    <div className={styles.toolGrid}>
      {tools.map((tool, i) => (
        <article className={styles.tool} key={tool.title}>
          <ClipboardList size={29} strokeWidth={1.2} />
          <h3>{tool.title}</h3>
          <p>{tool.intro}</p>
          <div className={styles.checklist}>
            {tool.items.map((item, j) => {
              const key = `${i}-${j}`;
              return (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={checked.includes(key)}
                    onChange={(e) =>
                      setChecked((old) =>
                        e.target.checked
                          ? [...old, key]
                          : old.filter((x) => x !== key),
                      )
                    }
                  />
                  <span>{item}</span>
                </label>
              );
            })}
          </div>
          <small>
            {t(
              "仅在当前页面勾选，刷新后清除。",
              "Selections stay on this page and clear on refresh.",
            )}
          </small>
          <Link
            className={styles.textLink}
            href={`${standalone ? `/${locale}/knowledge` : `/${locale}/wealth/guides`}/${i === 0 ? "family-goals" : "succession"}`}
          >
            {t("了解规划方法", "Explore the planning approach")}
            <ArrowUpRight size={16} />
          </Link>
        </article>
      ))}
    </div>
  );
}

export function WealthConsultation({ locale }: { locale: "zh" | "en" }) {
  const zh = locale === "zh",
    t = (a: string, b: string) => (zh ? a : b);
  const [direction, setDirection] = useState(""),
    [ready, setReady] = useState(false);
  return (
    <div className={styles.consultationCard} data-testid="wealth-consultation">
      <label htmlFor="wealth-direction">
        {t("希望讨论的方向", "What would you like to discuss?")}
      </label>
      <select
        id="wealth-direction"
        value={direction}
        onChange={(e) => {
          setDirection(e.target.value);
          setReady(false);
        }}
      >
        <option value="">
          {t("请选择一个规划方向", "Choose a planning direction")}
        </option>
        {[
          ["goals", "家庭目标与年度规划", "Family goals & annual planning"],
          [
            "structure",
            "资产结构与风险管理",
            "Asset structure & risk management",
          ],
          [
            "protection",
            "家庭保障与长期安排",
            "Protection & long-term arrangements",
          ],
          ["legacy", "家族传承与资料连续", "Legacy & information continuity"],
          [
            "cross-border",
            "跨境资源与全球布局",
            "Cross-border & global planning",
          ],
        ].map(([id, a, b]) => (
          <option value={id} key={id}>
            {t(a, b)}
          </option>
        ))}
      </select>
      <button
        className={styles.primary}
        type="button"
        disabled={!direction}
        onClick={() => setReady(true)}
      >
        {t("整理咨询准备", "Prepare your conversation")}
        <ArrowRight size={16} />
      </button>
      <p className={styles.footnote}>
        {t(
          "预约渠道尚未开放。本页仅整理咨询方向，不发送申请或预留时段。",
          "Booking is not yet available. This page helps prepare your direction; it does not send a request or reserve a time.",
        )}
      </p>
      {ready && (
        <div role="status" className={styles.prepared}>
          <Check size={20} />
          <p>
            {t(
              "已整理咨询方向。请准备家庭目标、相关地区及希望了解的问题，无需提供红线资料。尚未发送咨询或确认预约。",
              "Your direction is ready. Prepare your goals, relevant regions and questions, without sensitive records. No enquiry has been sent or appointment confirmed.",
            )}
          </p>
        </div>
      )}
      {(direction || ready) && (
        <button
          className={styles.clear}
          type="button"
          onClick={() => {
            setDirection("");
            setReady(false);
          }}
        >
          {t("清空选择", "Clear selection")}
        </button>
      )}
    </div>
  );
}
