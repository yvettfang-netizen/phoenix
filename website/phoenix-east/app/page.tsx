import Link from "next/link";

import { MobileWallpaperDownload } from "@/components/commerce";

const navigation = [
  { label: "Shop", en: "Online Store", href: "/shop" },
  { label: "丝织", en: "Silk", href: "/silk" },
  { label: "珠宝", en: "Jewellery", href: "/jewellery" },
  { label: "设计手记", en: "Journal", href: "#journal" },
  { label: "关于", en: "About", href: "#about" },
];

const PHOENIX_DIGITAL_WORLD_URL = "https://fengqi-research-institute.yvettfang.chatgpt.site";

const silkChapters = [
  {
    number: "01",
    title: "初羽",
    english: "BEGINNING",
    copy: "第一片羽，留住起身的光。",
    pattern: "HERITAGE FEATHER™",
    image: "/assets/heritage-patterns/heritage-feather.png",
    source: "畲锦窄带、花芯刺绣与凤凰羽翼",
    extraction: "羽片内部的菱格、花星与珠点",
    translation: "压低对比，收进初羽边缘与羽片层次",
    object: "初羽 BEGINNING Twilly",
  },
  {
    number: "02",
    title: "凤起",
    english: "RISING",
    copy: "让金线从传统边界中起势。",
    pattern: "SHE RIBBON™ / NOVA WEAVE™",
    image: "/assets/heritage-patterns/she-ribbon.png",
    source: "畲锦菱格带纹与织带间隔",
    extraction: "带状重复、斜向折线与几何节奏",
    translation: "转成沿金属线与丝巾边界向上的窄带",
    object: "凤起 RISING Silk Study",
  },
  {
    number: "03",
    title: "山海",
    english: "MOUNTAINS TO SEA",
    copy: "把地理与记忆，织进可以携带的日常。",
    pattern: "OPEN FRAME™ / HERITAGE PETAL™",
    image: "/assets/heritage-patterns/open-frame.png",
    source: "衣襟回折、包边层叠与花星结构",
    extraction: "框线转角、边界层次与花芯节点",
    translation: "把边框留白变成山海之间的观看窗口",
    object: "山海 LANDSCAPE Silk Study",
  },
  {
    number: "04",
    title: "锦羽",
    english: "JIN YU",
    copy: "经纬与羽翼，落在可佩戴的轮廓里。",
    pattern: "NOVA BEADS™ / PHOENIX DIAMOND™",
    image: "/assets/heritage-patterns/nova-beads.png",
    source: "珠点、针脚与凤凰菱形母纹",
    extraction: "微小点阵、菱形中心与羽翼边缘",
    translation: "以低密度点线守住锦羽 HERITAGE V1.1 的光泽",
    object: "锦羽 HERITAGE V1.1",
  },
];

const heritagePatterns = [
  {
    id: "she-ribbon",
    title: "SHE RIBBON™",
    chinese: "畲锦带纹",
    image: "/assets/heritage-patterns/she-ribbon.png",
    source: "畲锦窄带与服饰边饰",
    craft: "织带、包边与边饰节奏",
    extraction: "菱格、横向带状结构与几何间隔",
    translation: "压缩为丝巾边缘与页面细带，不铺满画面",
    works: "初羽 / 凤起 / 文化来源卡",
    status: "SOURCE REVIEW",
  },
  {
    id: "nova-weave",
    title: "NOVA WEAVE™",
    chinese: "凤启织纹",
    image: "/assets/heritage-patterns/she-ribbon.png",
    source: "畲锦菱格带纹及几何间隔节奏",
    craft: "织纹重复单元与窄带组织",
    extraction: "连续菱形、折线与留白的比例",
    translation: "转成页面节点、产品角标与丝织结构语言",
    works: "凤起 / 首发作品 / WING",
    status: "SYSTEM V1.1",
  },
  {
    id: "heritage-feather",
    title: "HERITAGE FEATHER™",
    chinese: "文化羽纹",
    image: "/assets/heritage-patterns/heritage-feather.png",
    source: "凤凰羽翼与 Heritage Visual System V1.1",
    craft: "羽片内部的织纹、花星、珠点与针脚",
    extraction: "羽片层叠、内嵌带纹与方向性线条",
    translation: "让文化细节成为凤凰羽翼本身的一部分",
    works: "Hero / 初羽 / WING",
    status: "FOUNDER SYSTEM",
  },
  {
    id: "heritage-petal",
    title: "HERITAGE PETAL™",
    chinese: "文化花星",
    image: "/assets/heritage-patterns/heritage-petal.png",
    source: "花芯与花瓣结构",
    craft: "花芯刺绣与花星组织",
    extraction: "中心花芯、放射花瓣与小面积色点",
    translation: "只在章节标题、花芯与局部节点出现",
    works: "LIGHT / 山海 / 丝织细节",
    status: "SOURCE REVIEW",
  },
  {
    id: "open-frame",
    title: "OPEN FRAME™",
    chinese: "启程框线",
    image: "/assets/heritage-patterns/open-frame.png",
    source: "衣襟回折、包边和层叠结构",
    craft: "衣襟边界、框线与层叠包边",
    extraction: "转角、回折、边界内外的层次关系",
    translation: "形成 ROOT 的开放框线与产品留白",
    works: "ROOT / 山海 / 预约水印",
    status: "SOURCE REVIEW",
  },
  {
    id: "nova-beads",
    title: "NOVA BEADS™",
    chinese: "星珠针点",
    image: "/assets/heritage-patterns/nova-beads.png",
    source: "针脚、珠点与边饰节奏",
    craft: "针脚、珠点与边饰的疏密",
    extraction: "点阵、串联轨迹与微小间隔",
    translation: "变成 HORIZON 向远方延展的轻轨迹",
    works: "锦羽 / HORIZON / 页面转场",
    status: "SYSTEM V1.1",
  },
  {
    id: "signature-tile",
    title: "PHOENIX NOVA SIGNATURE TILE™",
    chinese: "凤凰启纹母单元",
    image: "/assets/heritage-patterns/signature-tile-mark.png",
    source: "畲锦菱形、羽翼、花星与珠点的正式母纹单元",
    craft: "菱形结构与中心花星组织",
    extraction: "中心、边界、羽翼与点阵的四层关系",
    translation: "作为极轻角标、压纹与预约区水印",
    works: "首发作品 / 预约 / 文化来源卡",
    status: "FOUNDER SYSTEM",
  },
  {
    id: "phoenix-diamond",
    title: "PHOENIX DIAMOND™",
    chinese: "凤启菱簇",
    image: "/assets/heritage-patterns/phoenix-diamond-clean.png",
    source: "Signature Tile 的菱形识别单元",
    craft: "珠宝节点、内圈暗纹与页面识别标记",
    extraction: "菱形外框、中心花芯与深蓝留白",
    translation: "用于珠宝、角标与文化来源标记，不作满版纹样",
    works: "三枚戒指 / 凤凰婚戒 / Jewelry",
    status: "SYSTEM V1.1",
  },
];

const heritageUsageMap = [
  { area: "HERO", pattern: "HERITAGE FEATHER™", treatment: "羽翼内层一段低对比菱格带纹，保持凤凰轮廓与留白。" },
  { area: "首发作品", pattern: "SIGNATURE TILE™ / PHOENIX DIAMOND™", treatment: "只作作品角标、细边和压纹，不增加装饰墙。" },
  { area: "丝织四章", pattern: "SHE RIBBON™ / NOVA WEAVE™ / HERITAGE PETAL™ / NOVA BEADS™", treatment: "每章用一张 PATTERN DETAIL 展示文化线索到作品的转译。" },
  { area: "珠宝", pattern: "PHOENIX DIAMOND™ + INNER CULTURE TRACE", treatment: "在戒指图鉴旁展示内圈暗纹研究，不替代生产刻字文件。" },
  { area: "ROOT", pattern: "OPEN FRAME™ + 真实文化来源图", treatment: "以开放框线承接文化来源卡，来源状态清楚可见。" },
  { area: "LIGHT", pattern: "HERITAGE PETAL™ + 畲红花芯", treatment: "花星只在标题节点和小面积花芯出现。" },
  { area: "WING", pattern: "纹样提取 / 重复单元 / 材质转译", treatment: "以 Heritage Visual System V1.1 作为过程证据。" },
  { area: "HORIZON", pattern: "NOVA BEADS™", treatment: "形成向远方延展的点线轨迹，不做连续图案墙。" },
  { area: "预约", pattern: "MINIMAL SIGNATURE TILE™", treatment: "以透明低调水印留在深色背景，功能文字优先。" },
];

const ringDesigns = [
  {
    number: "01",
    slug: "qicheng-ring",
    title: "凤启·初光戒",
    english: "BEGINNING RING",
    image: "/assets/jewellery/phoenix-first-light-ring.png",
    alt: "凤启·初光戒，18K黄金凤凰展翼蓝宝石戒指设计图鉴",
    copy: "凤凰展翼，以初光照亮每一次新的开始。",
    specs: ["18K 黄金", "椭圆形蓝宝石（约 8 × 6 mm）", "天然钻石（碎钻）"],
  },
  {
    number: "02",
    slug: "jinyu-open-ring",
    title: "锦羽",
    english: "JIN YU / OPEN RING",
    image: "/assets/jinyu-gold-open-ring.png",
    alt: "锦羽系列18K黄金羽翼开放式戒指设计图鉴",
    copy: "羽织光影，轻语相伴。一圈可以被日常佩戴、被记住的光。",
    specs: ["18K 黄金", "培育钻石 Pavé", "可调节开放式戒"],
  },
  {
    number: "03",
    slug: "jinyu-platinum-10ct",
    title: "锦羽·铂金十克拉",
    english: "JIN YU / PLATINUM 10CT",
    image: "/assets/jinyu-platinum-10ct-ring.png",
    alt: "锦羽系列Pt950铂金10克拉培育钻凤凰羽翼戒指设计图鉴",
    copy: "以凤凰羽翼托起一颗盛大的光，让自由、轻盈与永恒同时抵达。",
    specs: ["Pt950 铂金", "10.00ct 培育钻", "D / FL / EX"],
  },
];

const storyPillars = [
  {
    number: "01",
    title: "ROOT",
    chinese: "根",
    copy: "从潮州的文化土壤出发，先理解，再创造。",
    pattern: "OPEN FRAME™",
    image: "/assets/heritage-patterns/open-frame.png",
  },
  {
    number: "02",
    title: "LIGHT",
    chinese: "光",
    copy: "让传统进入新的生活尺度，成为轻盈而有分量的故事。",
    note: "STORY CHAPTER",
    pattern: "HERITAGE PETAL™",
    image: "/assets/heritage-patterns/heritage-petal.png",
  },
  {
    number: "03",
    title: "WING",
    chinese: "翼",
    copy: "以凤凰羽翼为方向，将织纹、线条与金属转译为形。",
    pattern: "HERITAGE FEATHER™",
    image: "/assets/heritage-patterns/heritage-feather.png",
  },
  {
    number: "04",
    title: "HORIZON",
    chinese: "境",
    copy: "让一件作品进入日常、收藏与下一代的记忆。",
    pattern: "NOVA BEADS™",
    image: "/assets/heritage-patterns/nova-beads.png",
  },
];

const journalEntries = [
  {
    tag: "FORM / 01",
    title: "羽翼不是符号，而是一种方向。",
    copy: "在 Phoenix East，凤凰不被缩减成一个装饰图案；它决定作品如何展开、如何留白，也决定我们如何看待开始。",
  },
  {
    tag: "TEXTILE / 02",
    title: "从织带到轮廓，传统可以换一种被看见的方式。",
    copy: "纹样不必铺满整个画面。它可以藏在一段边缘、一条金属线，或一件作品最靠近身体的地方。",
  },
  {
    tag: "METHOD / 03",
    title: "克制，是让文化留下来的方法。",
    copy: "少一点堆叠，多一点辨认；少一点复刻，多一点真实的当代生活。",
  },
];

export default function Home() {
  return (
    <main className="pe-site" id="top">
      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label="Phoenix East 凤启东方首页">
          <img
            src="/assets/phoenix-nova-logo.png"
            alt="Phoenix Nova 官方 Logo"
            className="brand-logo"
          />
          <span className="brand-extension">
            <span>凤启东方</span>
            <strong>PHOENIX EAST</strong>
          </span>
        </a>

        <nav className="site-nav" aria-label="主导航">
          {navigation.map((item) => (
            <a href={item.href} key={item.href}>
              <span>{item.label}</span>
              <small>{item.en}</small>
            </a>
          ))}
          <a
            href={PHOENIX_DIGITAL_WORLD_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="进入凤启数字世界"
          >
            <span>数字凤启</span>
            <small>PHOENIX DIGITAL WORLD</small>
          </a>
        </nav>

        <a className="header-reserve" href="#reservation">
          预约设计 <span aria-hidden="true">↗</span>
        </a>
      </header>

      <nav className="mobile-nav" aria-label="移动端主导航">
        {navigation.map((item) => (
          <a href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
        <a href={PHOENIX_DIGITAL_WORLD_URL} target="_blank" rel="noreferrer">
          数字凤启
        </a>
        <a href="#reservation">预约</a>
      </nav>

      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">PHOENIX EAST / CONTEMPORARY EASTERN DESIGN</p>
          <h1 id="hero-title">凤启东方</h1>
          <p className="hero-tagline">
            东方意象，<em>当代成物。</em>
          </p>
          <p className="hero-description">
            从潮州的根出发，
            <br />
            将凤凰意象、畲族织纹与传统工艺，
            <br />
            转译为可佩戴、可收藏、可传承的当代作品。
          </p>
          <div className="hero-actions">
            <Link className="button button-dark" href="/shop">
              进入线上商店 <span aria-hidden="true">↗</span>
            </Link>
            <a className="text-link" href="#reservation">
              预约设计 <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="hero-meta">
            <span>CHAOZHOU / 潮州</span>
            <span>RESEARCH-LED</span>
            <span>OBJECT-FIRST</span>
          </div>
        </div>

        <figure className="hero-visual">
          <img
            src="/assets/phoenix-east-hero.png"
            alt="已批准凤凰视觉资产中的白金与浅蓝凤凰，飞过雾光与远山"
          />
          <div className="hero-veil" aria-hidden="true" />
          <div className="hero-wing-inlay" aria-hidden="true">
            <img src="/assets/heritage-patterns/wing-pattern-strip-small.png" alt="" />
          </div>
          <div className="hero-heritage-callout">
            <span className="heritage-node" aria-hidden="true" />
            <div>
              <strong>HERITAGE FEATHER™ / V1.1</strong>
              <span>织纹藏在羽翼内部</span>
            </div>
          </div>
          <div className="hero-visual-caption">
            <span>01 / PHOENIX IN MOTION</span>
            <span>光从羽翼之间进入</span>
          </div>
          <span className="hero-vertical-label">HERITAGE / OBJECT / HORIZON</span>
        </figure>
      </section>

      <section className="intro-band" aria-label="品牌简介">
        <p>CONTEMPORARY EASTERN DESIGN &amp; HERITAGE OBJECTS</p>
        <span aria-hidden="true">✦</span>
        <p>DESIGNED TO BE KEPT</p>
      </section>

      <section className="section-pad objects-section" id="objects" aria-labelledby="objects-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / FIRST OBJECTS</p>
            <h2 id="objects-title">首发作品</h2>
          </div>
          <p className="section-lede">
            一件作品，是文化被重新放进生活的尺度。
            <br />
            首发系列从羽翼、织纹与光开始。
          </p>
        </div>

        <div className="object-grid">
          <article className="object-card object-card-feature">
            <div className="object-image object-image-jinyu">
              <img
                src="/assets/jinyu-heritage.png"
                alt="锦羽 HERITAGE 金色凤凰羽翼开放式戒指设计图"
              />
              <span className="image-stamp">JIN YU / 01</span>
            </div>
            <div className="object-card-body">
              <div>
                <p className="card-kicker">JIN YU HERITAGE</p>
                <h3>锦羽</h3>
              </div>
              <p>羽织光影，轻语相伴。把陪伴与自由，收进一圈可以被记住的光。</p>
              <div className="object-details">
                <span>18K 黄金</span>
                <span>培育钻石</span>
                <span>微镶工艺</span>
              </div>
              <div className="object-pattern-line">
                <span className="pattern-chip-dot" aria-hidden="true" />
                <span>PHOENIX DIAMOND™ / 内圈文化暗纹</span>
              </div>
              <Link className="inline-link" href="/products/jinyu-open-ring">
                查看作品详情 <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </article>

          <article className="object-card object-card-silk">
            <div className="object-image object-image-silk">
              <img
                src="/assets/chuyu-silk.png"
                alt="初羽 BEGINNING Twilly 凤凰羽纹丝织设计样稿"
              />
              <span className="image-stamp">FIRST FEATHER</span>
            </div>
            <div className="object-card-body">
              <p className="card-kicker">SILK OBJECT / 01</p>
              <h3>初羽</h3>
              <p>一条 Twilly，从第一片羽开始，沿着金线和织纹慢慢展开。</p>
              <div className="object-pattern-line">
                <span className="pattern-chip-dot" aria-hidden="true" />
                <span>HERITAGE FEATHER™ / PATTERN DETAIL</span>
              </div>
              <a className="inline-link" href="#silk">
                进入丝织四章 <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>

          <article className="object-card object-card-rise">
            <div className="object-art-rise" aria-hidden="true">
              <span className="rise-line rise-line-one" />
              <span className="rise-line rise-line-two" />
              <span className="rise-line rise-line-three" />
              <span className="rise-line rise-line-four" />
              <span className="rise-mark">✦</span>
            </div>
            <div className="object-card-body">
              <p className="card-kicker">OBJECT STUDY / 02</p>
              <h3>凤起</h3>
              <p>织纹向上，金属线条留下方向感。一个正在形成的作品章节。</p>
              <div className="object-pattern-line">
                <span className="pattern-chip-dot" aria-hidden="true" />
                <span>NOVA WEAVE™ / OBJECT STUDY</span>
              </div>
              <Link className="inline-link" href="/products/fengqi">
                查看设计状态 <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section-pad silk-section" id="silk" aria-labelledby="silk-title">
        <div className="silk-topline">
          <div>
            <p className="eyebrow">02 / SILK CHAPTERS</p>
            <h2 id="silk-title">一条丝织，四次展开。</h2>
          </div>
          <p>
            不是把纹样搬到产品上，
            <br />
            而是让它找到新的呼吸方式。
          </p>
        </div>

        <div className="silk-feature">
          <div className="silk-feature-copy">
            <span className="silk-feature-index">THE FIRST FEATHER / 10 × 120 CM</span>
            <h3>初羽 BEGINNING</h3>
            <p>
              凤凰初生之羽，沿着潮绣、织带、花芯与珠点的节奏，成为一件可以被携带的东方记忆。
            </p>
            <a className="text-link" href="#translation">
              看见一件作品如何生成 <span aria-hidden="true">→</span>
            </a>
          </div>
          <figure className="silk-feature-image">
            <img
              src="/assets/chuyu-silk.png"
              alt="初羽丝织图案的凤凰羽纹、深蓝底色与金线细节"
            />
          </figure>
        </div>

        <div className="chapter-grid">
          {silkChapters.map((chapter) => (
            <article className="chapter-item" key={chapter.number}>
              <span className="chapter-number">{chapter.number}</span>
              <div className="chapter-detail-head">
                <span>PATTERN DETAIL</span>
                <strong>{chapter.pattern}</strong>
              </div>
              <div className={`chapter-detail-image chapter-detail-image-${chapter.number}`}>
                <img src={chapter.image} alt={`${chapter.title} ${chapter.pattern} 纹样细节`} />
              </div>
              <div>
                <p className="chapter-english">{chapter.english}</p>
                <h3>{chapter.title}</h3>
                <p>{chapter.copy}</p>
              </div>
              <dl className="chapter-translation">
                <div>
                  <dt>文化来源</dt>
                  <dd>{chapter.source}</dd>
                </div>
                <div>
                  <dt>结构提取</dt>
                  <dd>{chapter.extraction}</dd>
                </div>
                <div>
                  <dt>当代转译</dt>
                  <dd>{chapter.translation}</dd>
                </div>
                <div>
                  <dt>最终作品</dt>
                  <dd>{chapter.object}</dd>
                </div>
              </dl>
              <span className="chapter-arrow" aria-hidden="true">
                ↗
              </span>
            </article>
          ))}
        </div>

        <div className="silk-asset-teaser">
          <div className="silk-asset-teaser-heading">
            <div>
              <p className="eyebrow">FORMAL ASSETS / SILK</p>
              <h3>已确认的丝巾与文化视觉</h3>
            </div>
            <Link className="inline-link" href="/silk">
              查看全部丝巾档案 <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="silk-asset-teaser-grid">
            <figure>
              <img src="/assets/silk/phoenix-rising-silk-board.png" alt="凤起 RISING 凤凰羽纹丝巾视觉设计" />
              <figcaption><span>凤起</span><span>RISING</span></figcaption>
            </figure>
            <figure>
              <img src="/assets/silk/phoenix-mountains-to-sea-silk-board.png" alt="山海 MOUNTAINS TO SEA 丝巾视觉设计" />
              <figcaption><span>山海</span><span>MOUNTAINS TO SEA</span></figcaption>
            </figure>
            <figure>
              <img src="/assets/silk/phoenix-heritage-translation-plan.png" alt="Phoenix Heritage Visual System V1.1 文化来源与当代转译计划" />
              <figcaption><span>文化来源</span><span>HERITAGE V1.1</span></figcaption>
            </figure>
          </div>
        </div>
      </section>

      <MobileWallpaperDownload />

      <section className="jewelry-section" id="jewelry" aria-labelledby="jewelry-title">
        <div className="jewelry-inner">
          <div className="jewelry-copy">
            <p className="eyebrow eyebrow-light">03 / JEWELRY</p>
            <h2 id="jewelry-title">
              凤凰成饰，
              <br />
              让光靠近身体。
            </h2>
            <p className="jewelry-lede">
              珠宝不是一件被远远观看的物件。它随着佩戴者移动，在日常里保留一段属于自己的文化光泽。
            </p>
            <div className="jewelry-spec-list">
              <div>
                <span>FORM</span>
                <strong>羽翼开放式轮廓</strong>
              </div>
              <div>
                <span>MATERIAL</span>
                <strong>18K Gold / Lab-Grown Diamond</strong>
              </div>
              <div>
                <span>EDITION</span>
                <strong>Heritage / By Appointment</strong>
              </div>
            </div>
            <a className="button button-light" href="#reservation">
              预约设计 <span aria-hidden="true">↗</span>
            </a>
            <a className="text-link text-link-light" href="#ring-collection">
              查看三枚正式戒指 <span aria-hidden="true">→</span>
            </a>
          </div>

          <figure className="jewelry-image">
            <img
              src="/assets/jinyu-heritage.png"
              alt="锦羽 HERITAGE 后期修改版的金色羽翼戒指"
            />
            <figcaption>
              <span>JIN YU HERITAGE</span>
              <span>WOVEN IN LIGHT</span>
            </figcaption>
          </figure>
          <div className="jewelry-inner-detail">
            <div>
              <p className="jewelry-detail-kicker">INNER CULTURE TRACE</p>
              <h3>PHOENIX DIAMOND™</h3>
              <p>内圈文化暗纹研究：以菱形、花芯与深蓝留白，留下一条只有佩戴者知道的文化线。</p>
              <span>DESIGN STUDY / CULTURAL REVIEW PENDING</span>
            </div>
            <div className="inner-pattern-swatch">
              <img src="/assets/heritage-patterns/phoenix-diamond-clean.png" alt="PHOENIX DIAMOND 凤凰菱形内圈暗纹研究" />
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad ring-collection-section" id="ring-collection" aria-labelledby="ring-collection-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RING COLLECTION / 01—03</p>
            <h2 id="ring-collection-title">
              三枚戒指，
              <br />
              三种启程。
            </h2>
          </div>
          <p className="section-lede">
            今天确认的三枚单戒，分别从新生、羽织与盛大之光出发。
            <br />
            每一枚都保留完整设计图鉴，先看见作品，再预约了解。
          </p>
        </div>

        <div className="ring-design-grid">
          {ringDesigns.map((ring) => (
            <article className="ring-design-card" key={ring.number}>
              <div className="ring-design-image">
                <img src={ring.image} alt={ring.alt} />
                <span className="image-stamp">{ring.number} / PHOENIX EAST</span>
              </div>
              <div className="ring-design-body">
                <div className="ring-card-topline">
                  <span>{ring.english}</span>
                  <span>DESIGN STUDY</span>
                </div>
                <h3>{ring.title}</h3>
                <p>{ring.copy}</p>
                <div className="ring-specs">
                  {ring.specs.map((spec) => (
                    <span key={spec}>{spec}</span>
                  ))}
                </div>
                <Link className="inline-link" href={`/products/${ring.slug}`}>
                  查看作品详情 <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="wedding-ring-feature">
          <div className="wedding-ring-copy">
            <p className="eyebrow eyebrow-light">PHOENIX WEDDING RINGS / FINAL SET</p>
            <h3>
              凤求凰，
              <br />
              共舞九天。
            </h3>
            <p>
              采用下午最后确认的凤凰婚戒套装：凤戒守护、定力与方向；凰戒自由、灵动与光芒。两枚戒指各自成光，也在合璧时共同展开。
            </p>
            <div className="wedding-ring-pills" aria-label="凤凰婚戒系列">
              <span>凤戒 / 男款</span>
              <span>凰戒 / 女款</span>
              <span>合璧之姿 / 45° VIEW</span>
            </div>
            <a className="button button-light" href="#reservation">
              预约凤启对戒 <span aria-hidden="true">↗</span>
            </a>
          </div>
          <figure className="wedding-ring-image">
            <img
              src="/assets/phoenix-wedding-rings-final.png"
              alt="凤凰婚戒最终套装，包含凤戒男款、凰戒女款、合璧视图与内圈刻字"
            />
            <figcaption>
              <span>FENG &amp; HUANG</span>
              <span>TOGETHER AS ONE</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="section-pad story-section" id="story" aria-labelledby="story-title">
        <div className="story-heading">
          <div>
            <p className="eyebrow">04 / THE EASTERN LINE</p>
            <h2 id="story-title">ROOT / LIGHT / WING / HORIZON</h2>
          </div>
          <p>
            一条从根出发、经过光、长出翅膀，最终抵达远方的文化线。
          </p>
        </div>

        <div className="story-grid">
          {storyPillars.map((pillar) => (
            <article className="story-pillar" key={pillar.title}>
              <div className="story-pillar-top">
                <span>{pillar.number}</span>
                {pillar.note ? <small>{pillar.note}</small> : null}
              </div>
              <div className={`story-pattern story-pattern-${pillar.title.toLowerCase()}`}>
                <img src={pillar.image} alt={`${pillar.pattern} ${pillar.chinese} 纹样细节`} />
                <span>{pillar.pattern}</span>
              </div>
              <p className="story-word">{pillar.title}</p>
              <h3>{pillar.chinese}</h3>
              <p>{pillar.copy}</p>
              <span className="story-line" aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className="translation-section" id="translation" aria-labelledby="translation-title">
        <div className="translation-inner">
          <div className="translation-copy">
            <p className="eyebrow">05 / FROM HERITAGE TO OBJECT</p>
            <h2 id="translation-title">
              文化不被复制，
              <br />
              被重新理解。
            </h2>
            <p>
              Phoenix East 以研究为起点，以设计为语言。畲族元素只在需要被看见的地方出现：羽翼内部、织纹、边框、金属线条与局部配色。
            </p>
            <p>
              我们保留来源，也保留当代生活的自由。每一次转译，都要回答一个问题：它是否值得被佩戴、被收藏、被继续讲述？
            </p>
          </div>
          <div className="translation-process">
            <div className="process-step">
              <span>01</span>
              <div>
                <strong>RESEARCH</strong>
                <p>先看见文化发生的地方与脉络。</p>
              </div>
            </div>
            <div className="process-step">
              <span>02</span>
              <div>
                <strong>TRANSLATION</strong>
                <p>提取结构、节奏、颜色与意义。</p>
              </div>
            </div>
            <div className="process-step">
              <span>03</span>
              <div>
                <strong>OBJECT</strong>
                <p>把抽象文化变成可被长期使用的作品。</p>
              </div>
            </div>
            <div className="translation-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

        <div className="heritage-integration-panel">
          <div className="heritage-panel-heading">
            <div>
              <p className="eyebrow">HERITAGE PATTERN COMPONENTS / V1.1</p>
              <h3>把文化线索，变成可以复用的网页语言。</h3>
            </div>
            <p>
              本页只调用已批准图板中的局部视觉。每一张文化来源卡都保留原始资料、结构提取、当代转译、使用作品与当前审核状态。
            </p>
          </div>

          <div className="heritage-component-grid">
            {heritagePatterns.map((pattern) => (
              <article className="heritage-component-card" key={pattern.id}>
                <div className={`heritage-component-media heritage-component-media-${pattern.id}`}>
                  <img src={pattern.image} alt={`${pattern.title} ${pattern.chinese} 纹样组件`} />
                  <span>{pattern.status}</span>
                </div>
                <div className="heritage-component-body">
                  <p className="card-kicker">{pattern.title}</p>
                  <h4>{pattern.chinese}</h4>
                  <dl>
                    <div>
                      <dt>原始资料</dt>
                      <dd>{pattern.source}</dd>
                    </div>
                    <div>
                      <dt>服饰 / 工艺</dt>
                      <dd>{pattern.craft}</dd>
                    </div>
                    <div>
                      <dt>结构提取</dt>
                      <dd>{pattern.extraction}</dd>
                    </div>
                    <div>
                      <dt>当代转译</dt>
                      <dd>{pattern.translation}</dd>
                    </div>
                    <div>
                      <dt>使用作品</dt>
                      <dd>{pattern.works}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>

          <div className="heritage-board-grid">
            <figure className="heritage-board-card">
              <img
                src="/assets/heritage-visual-system-v1-1.png"
                alt="Phoenix Nova Heritage Visual System V1.1 正式视觉系统图板"
              />
              <figcaption>
                <span>APPROVED BOARD / V1.1</span>
                <strong>Phoenix Nova Heritage Visual System</strong>
              </figcaption>
            </figure>
            <figure className="heritage-board-card">
              <img
                src="/assets/she-heritage-reference-board.png"
                alt="畲族文化参考板，包含来源、结构提取、当代转译与应用示意"
              />
              <figcaption>
                <span>SOURCE BOARD / REVIEW</span>
                <strong>畲族文化来源与结构提取参考</strong>
              </figcaption>
            </figure>
          </div>

          <div className="heritage-usage-map">
            <div className="heritage-subheading">
              <p className="eyebrow">HOMEPAGE MAPPING</p>
              <h3>首页每一区域的纹样映射</h3>
            </div>
            <div className="heritage-usage-grid">
              {heritageUsageMap.map((item) => (
                <div className="heritage-usage-row" key={item.area}>
                  <span>{item.area}</span>
                  <strong>{item.pattern}</strong>
                  <p>{item.treatment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="reservation-section" id="reservation" aria-labelledby="reservation-title">
        <div className="reservation-inner">
          <div className="reservation-watermark" aria-hidden="true">
            <img src="/assets/heritage-patterns/signature-tile-mark-transparent.png" alt="" />
          </div>
          <div>
            <p className="eyebrow eyebrow-light">06 / RESERVATION</p>
            <h2 id="reservation-title">
              让一件作品，
              <br />
              先为你保留。
            </h2>
          </div>
          <div className="reservation-copy">
            <p>
              首期开放：首发作品、限量定制与 Heritage 文化合作。所有作品以预约方式了解，不以喧闹的货架陈列替代人与作品的相遇。
            </p>
            <div className="reservation-tags" aria-label="预约方向">
              <span>首发作品</span>
              <span>限量定制</span>
              <span>文化合作</span>
            </div>
            <div className="reservation-steps" aria-label="预约与定制流程">
              <div>
                <span>01</span>
                <strong>选择方向</strong>
              </div>
              <div>
                <span>02</span>
                <strong>确认尺寸与材质</strong>
              </div>
              <div>
                <span>03</span>
                <strong>沟通设计方案</strong>
              </div>
              <div>
                <span>04</span>
                <strong>确认制作与交易方式</strong>
              </div>
            </div>
            <p className="reservation-note">预约登记不等同最终订单；团队确认后，再进入制作、微店交易或定制流程。</p>
            <a className="button button-outline-light" href="#about">
              了解 Phoenix East <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section className="section-pad journal-section" id="journal" aria-labelledby="journal-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">07 / DESIGN JOURNAL</p>
            <h2 id="journal-title">设计志</h2>
          </div>
          <p className="section-lede">
            记录一件作品如何从文化线索，走到人的手边。
          </p>
        </div>
        <div className="journal-grid">
          {journalEntries.map((entry) => (
            <article className="journal-card" key={entry.tag}>
              <p className="card-kicker">{entry.tag}</p>
              <h3>{entry.title}</h3>
              <p>{entry.copy}</p>
              <a className="inline-link" href="#about">
                继续阅读 <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section" id="about" aria-labelledby="about-title">
        <div className="about-inner">
          <div>
            <p className="eyebrow">08 / ABOUT PHOENIX EAST</p>
            <h2 id="about-title">
              从潮州出发，
              <br />
              把东方带到更远的地方。
            </h2>
          </div>
          <div className="about-copy">
            <p className="about-statement">
              Phoenix East is a contemporary Eastern design practice rooted in heritage research, translated through objects.
            </p>
            <p>
              我们相信，传统不必停留在被观看的位置。它可以被佩戴、被使用、被赠予，也可以在新的生活里继续生长。
            </p>
            <span className="about-signature">PHOENIX EAST / FOR EVERY BEGINNING.</span>
          </div>
        </div>
      </section>

      <section className="review-notes" id="review-notes" aria-labelledby="review-title">
        <details>
          <summary id="review-title">
            <span>Founder review / Asset Mapping</span>
            <span aria-hidden="true">＋</span>
          </summary>
          <div className="review-content">
            <div className="review-intro">
              <p className="eyebrow">CANDIDATE NOTES / NOT PUBLIC NAVIGATION</p>
              <p>
                这是本轮 Candidate 的素材与边界记录。正式公开前，仍需完成文化图片的来源、授权与署名核验。
              </p>
            </div>
            <div className="review-table-wrap">
              <table>
                <caption className="sr-only">Phoenix East Candidate 资产映射</caption>
                <thead>
                  <tr>
                    <th>资产</th>
                    <th>本候选站用途</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Phoenix Nova™ Official Logo System V1.0</td>
                    <td>Header 官方 Logo，使用原始横版裁切</td>
                    <td><span className="status status-approved">Approved source</span></td>
                  </tr>
                  <tr>
                    <td>鳳啟環球：鳳凰之翼與未來藍圖.png</td>
                    <td>Hero 凤凰构图，保留原始凤凰，仅裁切构图</td>
                    <td><span className="status status-approved">Approved Phoenix asset</span></td>
                  </tr>
                  <tr>
                    <td>锦羽系列珠宝设计图鉴.png</td>
                    <td>锦羽 HERITAGE 正式视觉与 Jewelry 主图</td>
                    <td><span className="status status-approved">Founder-specified revision</span></td>
                  </tr>
                  <tr>
                    <td>初羽凤凰羽纹丝巾设计样稿.png</td>
                    <td>Silk Chapters 的丝织样稿与初羽细节</td>
                    <td><span className="status status-review">Source review</span></td>
                  </tr>
                  <tr>
                    <td>Heritage Visual System V1.1 / 畲韵文化参考板</td>
                    <td>仅作局部织纹、配色与边框语言参考</td>
                    <td><span className="status status-review">Authorization check</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="hero-before-after">
              <figure className="hero-review-figure">
                <div className="hero-review-image">
                  <img src="/assets/phoenix-east-hero.png" alt="Hero Before：仅展示凤凰、丝绸、金属与东方雾光" />
                </div>
                <figcaption>
                  <span>BEFORE / HERO</span>
                  <strong>凤凰主视觉，文化线索主要停留在文案。</strong>
                </figcaption>
              </figure>
              <div className="hero-review-arrow" aria-hidden="true">→</div>
              <figure className="hero-review-figure hero-review-figure-after">
                <div className="hero-review-image">
                  <img src="/assets/phoenix-east-hero.png" alt="Hero After：在凤凰羽翼内部加入低对比 Heritage Feather 纹样层" />
                  <span className="hero-review-inlay" aria-hidden="true">
                    <img src="/assets/heritage-patterns/wing-pattern-strip-small.png" alt="" />
                  </span>
                </div>
                <figcaption>
                  <span>AFTER / HERITAGE FEATHER™</span>
                  <strong>第一眼是凤凰，第二眼才发现畲族织纹。</strong>
                </figcaption>
              </figure>
            </div>
            <div className="before-after">
              <div>
                <p className="card-kicker">PREVIOUS DIRECTION</p>
                <h3>World-first / character-led</h3>
                <p>入口、世界观与角色承担主要叙事。</p>
              </div>
              <div className="before-after-arrow" aria-hidden="true">→</div>
              <div>
                <p className="card-kicker">THIS CANDIDATE</p>
                <h3>Object-first / appointment-led</h3>
                <p>凤凰成为精神主角，作品成为第一行动。</p>
              </div>
            </div>
            <div className="heritage-ratio-check">
              <div className="heritage-subheading">
                <p className="eyebrow">VISIBILITY SELF-CHECK</p>
                <h3>畲族显性比例自检</h3>
              </div>
              <div className="ratio-check-grid">
                <div><span>HERO</span><strong>约 10%</strong><p>羽翼内层低对比，保持东方留白。</p></div>
                <div><span>SILK / STORY</span><strong>约 30%</strong><p>通过 PATTERN DETAIL 与来源卡放大辨认。</p></div>
                <div><span>FUNCTION UI</span><strong>约 5%</strong><p>仅保留花星、细带与小角标。</p></div>
                <div><span>OVERALL</span><strong>20–30%</strong><p>不形成满版连续纹样或 Monogram 墙。</p></div>
              </div>
            </div>
            <div className="pending-assets">
              <div className="heritage-subheading">
                <p className="eyebrow">OPEN REVIEW ITEMS</p>
                <h3>仍待文化审核或授权的资产</h3>
              </div>
              <ul>
                <li><strong>she-heritage-reference-board.png</strong><span>来源图片、服饰部位、商业使用范围与署名方式待核。</span></li>
                <li><strong>heritage-patterns/*</strong><span>均为 V1.1 图板的局部提取，继承原图的来源与授权状态，不等同于独立授权的纹样库。</span></li>
                <li><strong>chuyu-silk.png / 初羽样稿</strong><span>产品视觉可作 Candidate 展示，文化来源与商业化使用说明待补齐。</span></li>
                <li><strong>phoenix-wedding-rings-final.png</strong><span>Founder 确认的最终设计图鉴；内圈刻字与正式生产授权仍待确认。</span></li>
              </ul>
            </div>
            <p className="review-warning">
              待核验：畲族服饰、刺绣、织带等文化图片的原始来源、授权范围、署名方式与商业使用许可；在完成核验前，不把任何文化原图扩展为满版背景。
            </p>
          </div>
        </details>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <span>凤启东方</span>
          <strong>PHOENIX EAST</strong>
        </div>
        <p>A Phoenix Nova™ Heritage Initiative</p>
        <a href={PHOENIX_DIGITAL_WORLD_URL} target="_blank" rel="noreferrer">
          进入凤启数字世界 ↗
        </a>
        <a href="#top" aria-label="返回顶部">回到顶部 ↑</a>
      </footer>
    </main>
  );
}
