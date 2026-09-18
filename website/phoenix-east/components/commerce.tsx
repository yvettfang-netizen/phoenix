import type { ReactNode } from "react";
import Link from "next/link";

import {
  collectionDefinitions,
  getProductsByCollection,
  officialAssetInventory,
  missingCommerceAssets,
  products,
  silkAssetGallery,
  type CommerceCollection,
  type CommerceProduct,
} from "@/lib/commerce";

const primaryNavigation = [
  { label: "Shop", href: "/shop" },
  { label: "丝织", href: "/silk" },
  { label: "珠宝", href: "/jewellery" },
  { label: "设计手记", href: "/#journal" },
  { label: "关于", href: "/#about" },
];

const PHOENIX_DIGITAL_WORLD_URL = "https://fengqi-research-institute.yvettfang.chatgpt.site";

export function CommerceHeader() {
  return (
    <>
      <header className="site-header commerce-header">
        <Link className="brand-lockup" href="/" aria-label="Phoenix East 凤启东方首页">
          <img
            src="/assets/phoenix-nova-logo.png"
            alt="Phoenix Nova 官方 Logo"
            className="brand-logo"
          />
          <span className="brand-extension">
            <span>凤启东方</span>
            <strong>PHOENIX EAST</strong>
          </span>
        </Link>

        <nav className="site-nav" aria-label="主导航">
          {primaryNavigation.map((item) => (
            <Link href={item.href} key={item.href}>
              <span>{item.label}</span>
              <small>PHOENIX EAST</small>
            </Link>
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

        <Link className="header-reserve" href="/#reservation">
          预约设计 <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <nav className="mobile-nav commerce-mobile-nav" aria-label="移动端主导航">
        {primaryNavigation.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
        <a href={PHOENIX_DIGITAL_WORLD_URL} target="_blank" rel="noreferrer">
          数字凤启
        </a>
        <Link href="/#reservation">预约</Link>
      </nav>
    </>
  );
}

export function CommerceFooter() {
  return (
    <footer className="site-footer commerce-footer">
      <div className="footer-brand">
        <span>凤启东方</span>
        <strong>PHOENIX EAST</strong>
      </div>
      <p>A Phoenix Nova™ Heritage Initiative</p>
      <a href={PHOENIX_DIGITAL_WORLD_URL} target="_blank" rel="noreferrer">
        进入凤启数字世界 ↗
      </a>
      <Link href="/">返回凤启东方首页 ↑</Link>
    </footer>
  );
}

export function CommerceLayout({ children }: { children: ReactNode }) {
  return (
    <main className="pe-site commerce-site" id="top">
      <CommerceHeader />
      {children}
      <CommerceFooter />
    </main>
  );
}

export function CollectionNavigation({ current }: { current?: CommerceCollection }) {
  return (
    <nav className="collection-navigation" aria-label="Shop Collection Navigation">
      <Link className={!current ? "is-current" : ""} href="/shop">
        <span>全部作品</span>
        <small>SHOP</small>
      </Link>
      {collectionDefinitions.map((collection) => (
        <Link
          className={current === collection.slug ? "is-current" : ""}
          href={collection.href}
          key={collection.slug}
        >
          <span>{collection.label}</span>
          <small>{collection.english}</small>
        </Link>
      ))}
    </nav>
  );
}

function AvailabilityBadge({ product }: { product: CommerceProduct }) {
  return (
    <div className="availability-stack">
      <span className={`availability-badge availability-${product.availabilityKind}`}>
        {product.availability}
      </span>
      <span className="availability-status">{product.status}</span>
    </div>
  );
}

export function AvailabilityAction({
  product,
  compact = false,
}: {
  product: CommerceProduct;
  compact?: boolean;
}) {
  if (product.availabilityKind === "store" && product.storeUrl) {
    return (
      <div className="availability-action">
        <a
          className={`button button-dark commerce-cta ${compact ? "is-compact" : ""}`}
          href={product.storeUrl}
          target="_blank"
          rel="noreferrer"
        >
          去官方微店购买 <span aria-hidden="true">↗</span>
        </a>
        <p>将前往凤启东方官方微店完成购买。</p>
      </div>
    );
  }

  if (product.availabilityKind === "reservation") {
    return (
      <div className="availability-action">
        <Link
          className={`button button-dark commerce-cta ${compact ? "is-compact" : ""}`}
          href="/#reservation"
        >
          预约定制 <span aria-hidden="true">↗</span>
        </Link>
        <p>预约不等同最终订单，尺寸、材质与设计方案需由团队确认。</p>
      </div>
    );
  }

  return (
    <div className="availability-action">
      <span className={`commerce-coming-soon ${compact ? "is-compact" : ""}`}>
        即将上架 <span aria-hidden="true">·</span> Coming Soon
      </span>
      <p>正式商品链接与供应状态确认后开放。</p>
    </div>
  );
}

export function ProductCard({ product }: { product: CommerceProduct }) {
  return (
    <article className={`commerce-product-card ${!product.image ? "is-text-only" : ""}`}>
      <div className={`commerce-product-media commerce-product-media-${product.collection}`}>
        {product.image ? (
          <img src={product.image} alt={product.alt ?? `${product.title} ${product.english}`} />
        ) : (
          <div className="commerce-placeholder-content">
            <span>{product.collectionLabel}</span>
            <strong>{product.title}</strong>
            <small>FORMAL ASSET PENDING</small>
          </div>
        )}
        <span className="commerce-asset-label">{product.assetType}</span>
      </div>
      <div className="commerce-product-body">
        <div className="commerce-card-heading">
          <div>
            <p className="card-kicker">{product.collectionLabel}</p>
            <h2>{product.title}</h2>
            <p className="commerce-product-english">{product.english}</p>
          </div>
          <span className="commerce-card-number">{String(products.indexOf(product) + 1).padStart(2, "0")}</span>
        </div>
        <p className="commerce-product-copy">{product.copy}</p>
        <div className="commerce-materials">
          {product.materials.map((material) => (
            <span key={material}>{material}</span>
          ))}
        </div>
        <AvailabilityBadge product={product} />
        <div className="commerce-card-actions">
          <Link className="inline-link" href={`/products/${product.slug}`}>
            查看作品详情 <span aria-hidden="true">↗</span>
          </Link>
          <AvailabilityAction product={product} compact />
        </div>
      </div>
    </article>
  );
}

export function SilkAssetGallery() {
  return (
    <section className="silk-asset-gallery section-pad" aria-labelledby="silk-asset-gallery-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SILK / FORMAL ASSET ARCHIVE</p>
          <h2 id="silk-asset-gallery-title">已确认丝巾视觉</h2>
        </div>
        <p className="section-lede">
          以下视觉按真实属性标识：设计样稿、纹样研究、文化来源与佩戴参考分开呈现，不把渲染图写成实物照片。
        </p>
      </div>
      <div className="silk-asset-gallery-grid">
        {silkAssetGallery.map((asset, index) => (
          <figure className="silk-asset-card" key={asset.asset}>
            <div className="silk-asset-media">
              <img src={asset.asset} alt={`${asset.title} ${asset.english} 视觉资产`} />
              <span className="commerce-asset-label">{asset.assetType}</span>
            </div>
            <figcaption>
              <span className="silk-asset-number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{asset.title}</h3>
                <p>{asset.english}</p>
                <small>{asset.caption}</small>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function MobileWallpaperDownload() {
  return (
    <section className="mobile-wallpaper-download section-pad" id="mobile-wallpaper" aria-labelledby="mobile-wallpaper-title">
      <div className="mobile-wallpaper-copy">
        <p className="eyebrow eyebrow-light">FREE WALLPAPER / BEGINNING</p>
        <h2 id="mobile-wallpaper-title">初羽手机屏保</h2>
        <p className="mobile-wallpaper-lede">每一次启程，都有一束光。</p>
        <p className="mobile-wallpaper-note">
          下载初羽手机屏保，作为个人设备的免费视觉使用。它是品牌文化视觉资产，不是商品、订单或购买入口。
        </p>
        <a
          className="button button-light mobile-wallpaper-download-link"
          href="/assets/mobile-wallpaper-chuyu.png"
          download="phoenix-east-beginning-wallpaper.png"
        >
          手机屏保免费下载 <span aria-hidden="true">↓</span>
        </a>
      </div>
      <figure className="mobile-wallpaper-media">
        <div className="mobile-wallpaper-image-wrap">
          <img src="/assets/mobile-wallpaper-chuyu.png" alt="初羽手机屏保：金色与深蓝凤凰羽翼立于晨光之中" />
        </div>
        <figcaption>
          <span>BEGINNING</span>
          <span>FOR EVERY BEGINNING.</span>
        </figcaption>
      </figure>
    </section>
  );
}

export function AvailabilityLegend() {
  return (
    <section className="availability-legend" aria-labelledby="availability-title">
      <div>
        <p className="eyebrow">AVAILABILITY STATES</p>
        <h2 id="availability-title">每件作品只有一个真实状态。</h2>
      </div>
      <div className="availability-legend-grid">
        <div>
          <span className="availability-badge availability-store">去官方微店购买</span>
          <p>仅用于已有对应微店详情页链接的标准商品。</p>
        </div>
        <div>
          <span className="availability-badge availability-reservation">预约定制</span>
          <p>用于大克拉、定制戒指与需要方案确认的高价值作品。</p>
        </div>
        <div>
          <span className="availability-badge availability-coming-soon">即将上架</span>
          <p>没有正式链接或供应资料时，只显示不可点击状态。</p>
        </div>
      </div>
    </section>
  );
}

export function CommerceModelNote() {
  return (
    <section className="commerce-model-note" aria-labelledby="commerce-model-title">
      <div className="commerce-model-copy">
        <p className="eyebrow eyebrow-light">PHASE 1 / COMMERCE MODEL</p>
        <h2 id="commerce-model-title">官网负责理解，微店负责交易。</h2>
        <p>
          凤启东方现阶段不开发自有电商后台。网站负责作品目录、设计来源、文化故事与可获得方式；标准商品的下单、支付、库存、物流、退款与售后，以官方微店为唯一准源。
        </p>
      </div>
      <div className="commerce-model-steps">
        <div>
          <span>01</span>
          <strong>理解作品</strong>
          <p>看见设计、文化来源与真实资产属性。</p>
        </div>
        <div>
          <span>02</span>
          <strong>选择方式</strong>
          <p>标准商品去微店；高价值作品走预约。</p>
        </div>
        <div>
          <span>03</span>
          <strong>完成确认</strong>
          <p>交易、库存与售后不在官网重复维护。</p>
        </div>
      </div>
    </section>
  );
}

function JewelleryRows({
  collectionProducts,
  compact = false,
  ariaLabel,
}: {
  collectionProducts: CommerceProduct[];
  compact?: boolean;
  ariaLabel: string;
}) {
  const rows = [
    {
      tone: "gold" as const,
      number: "01",
      label: "金色系列",
      english: "GOLD / WARM LIGHT",
      note: "18K 黄金与黄金羽翼设计",
    },
    {
      tone: "silver" as const,
      number: "02",
      label: "银色系列",
      english: "SILVER / PLATINUM LIGHT",
      note: "Pt950 铂金与银色羽翼结构",
    },
  ];

  return (
    <div className={`jewellery-rows ${compact ? "is-compact" : "section-pad"}`} aria-label={ariaLabel}>
      {rows.map((row) => {
        const rowProducts = collectionProducts.filter((product) => product.metalTone === row.tone);

        if (rowProducts.length === 0) {
          return null;
        }

        return (
          <section className={`jewellery-row jewellery-row-${row.tone}`} key={row.tone} aria-labelledby={`jewellery-row-${row.tone}-title`}>
            <div className="jewellery-row-heading">
              <div>
                <p className="eyebrow">{row.number} / {row.english}</p>
                <h2 id={`jewellery-row-${row.tone}-title`}>{row.label}</h2>
              </div>
              <p>{row.note}</p>
            </div>
            <div className={`commerce-product-grid ${compact ? "commerce-product-grid-compact" : ""}`}>
              {rowProducts.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CommerceProductGrid({
  collection,
  collectionProducts,
  compact = false,
  ariaLabel,
}: {
  collection: CommerceCollection;
  collectionProducts: CommerceProduct[];
  compact?: boolean;
  ariaLabel: string;
}) {
  if (collection === "jewellery") {
    return (
      <JewelleryRows
        collectionProducts={collectionProducts}
        compact={compact}
        ariaLabel={ariaLabel}
      />
    );
  }

  return (
    <div
      className={`commerce-product-grid ${compact ? "commerce-product-grid-compact" : "section-pad"}`}
      aria-label={ariaLabel}
    >
      {collectionProducts.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}

export function CollectionPage({
  collection,
  eyebrow,
  title,
  intro,
}: {
  collection: CommerceCollection;
  eyebrow: string;
  title: string;
  intro: string;
}) {
  const collectionProducts = getProductsByCollection(collection);

  return (
    <CommerceLayout>
      <section className="commerce-page-hero section-pad">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        <p>{intro}</p>
      </section>
      <CollectionNavigation current={collection} />
      <section className="commerce-collection-intro section-pad">
        <p className="section-lede">
          {collectionDefinitions.find((item) => item.slug === collection)?.summary}
        </p>
      </section>
      <CommerceProductGrid
        collection={collection}
        collectionProducts={collectionProducts}
        ariaLabel={`${title}作品目录`}
      />
      {collection === "silk" ? <SilkAssetGallery /> : null}
      {collection === "silk" ? <MobileWallpaperDownload /> : null}
      <AvailabilityLegend />
      <CommerceModelNote />
    </CommerceLayout>
  );
}

export function ShopPage() {
  return (
    <CommerceLayout>
      <section className="commerce-page-hero commerce-shop-hero section-pad">
        <div>
          <p className="eyebrow">SHOP / ONLINE STORE</p>
          <h1>线上商店</h1>
        </div>
        <div className="commerce-shop-hero-copy">
          <p>
            凤启东方全部正式作品与商品的总入口。先理解作品，再选择真实可获得的方式。
          </p>
          <span>标准商品由官方微店完成交易；高价值与定制作品通过预约确认。</span>
        </div>
      </section>
      <CollectionNavigation />
      <section className="shop-catalog section-pad" aria-labelledby="shop-catalog-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SHOP / CATALOG</p>
            <h2 id="shop-catalog-title">正式作品目录</h2>
          </div>
          <p className="section-lede">
            当前页面只使用已经确认的设计资产与真实状态。没有正式资产或链接的集合，以文字状态保留。
          </p>
        </div>
        {collectionDefinitions.map((collection) => {
          const collectionProducts = getProductsByCollection(collection.slug);
          return (
            <section className="shop-catalog-group" key={collection.slug}>
              <div className="shop-catalog-group-heading">
                <div>
                  <p className="card-kicker">{collection.english}</p>
                  <h3>{collection.label}</h3>
                </div>
                <Link className="inline-link" href={collection.href}>
                  进入 Collection <span aria-hidden="true">→</span>
                </Link>
              </div>
              <CommerceProductGrid
                collection={collection.slug}
                collectionProducts={collectionProducts}
                compact
                ariaLabel={`${collection.label}作品目录`}
              />
            </section>
          );
        })}
      </section>
      <AvailabilityLegend />
      <CommerceModelNote />
      <StoryObjectBridge />
      <CommerceAuditPanel />
    </CommerceLayout>
  );
}

export function CommerceAuditPanel() {
  return (
    <section className="commerce-audit section-pad" aria-labelledby="commerce-audit-title">
      <details>
        <summary id="commerce-audit-title">
          <span>Founder review / Commerce Gate</span>
          <span aria-hidden="true">＋</span>
        </summary>
        <div className="commerce-audit-content">
          <div className="review-intro">
            <p className="eyebrow">INTERNAL MAPPING / NOT PUBLIC NAVIGATION</p>
            <p>
              这一部分记录商品链接、资产分类与缺口，方便后续接入真实微店详情页。当前没有任何虚构 URL、空链接或假支付流程。
            </p>
          </div>
          <div className="review-table-wrap">
            <table>
              <caption className="sr-only">官方微店商品链接映射表</caption>
              <thead>
                <tr>
                  <th>作品</th>
                  <th>官网状态</th>
                  <th>官方微店详情页</th>
                  <th>CTA</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.slug}>
                    <td>{product.title}</td>
                    <td>{product.availability}</td>
                    <td>{product.storeUrl ?? "未提供 / 不可编造"}</td>
                    <td>
                      {product.availabilityKind === "reservation"
                        ? "预约定制"
                        : product.availabilityKind === "store"
                          ? "去官方微店购买"
                          : "不可点击：即将上架"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="commerce-audit-lists">
            <div>
              <p className="card-kicker">FORMAL ASSETS IN THIS RELEASE</p>
              <ul>
                {officialAssetInventory.map((item) => (
                  <li key={item.asset}>
                    <strong>{item.asset}</strong>
                    <span>{item.type} · {item.state}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="card-kicker">MISSING / BLOCKED</p>
              <ul>
                {missingCommerceAssets.map((item) => (
                  <li key={item.asset}>
                    <strong>{item.asset}</strong>
                    <span>{item.impact} · {item.action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="review-warning">
            空链接扫描结果：本次新增 Commerce CTA 不含 `#`、空 href、假商品链接或错误替代链接；所有 Coming Soon 状态均为不可点击文本。现有首页的区块锚点仍为站内真实位置。
          </p>
        </div>
      </details>
    </section>
  );
}

export function StoryObjectBridge() {
  return (
    <section className="story-object-bridge section-pad" aria-labelledby="story-object-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">STORY → OBJECT</p>
          <h2 id="story-object-title">小说负责情绪，作品负责解释。</h2>
        </div>
        <p className="section-lede">
          《维港之上》等连载可以承接作品出现的场景，但不直接变成销售页面。
        </p>
      </div>
      <div className="story-object-steps">
        <div>
          <span>01</span>
          <strong>已确认的章节场景</strong>
          <p>只使用 Founder 确认已经出现的丝巾、戒指或礼物场景。</p>
        </div>
        <div>
          <span>02</span>
          <strong>故事中的作品</strong>
          <p>章节结尾分区标注，不改剧情，不把文学内容写成广告。</p>
        </div>
        <div>
          <span>03</span>
          <strong>正式作品详情</strong>
          <p>进入真实存在的作品页面，说明文化来源、材质与作品状态。</p>
        </div>
        <div>
          <span>04</span>
          <strong>微店或预约</strong>
          <p>标准商品进入官方微店；高价值与定制作品进入预约流程。</p>
        </div>
      </div>
      <div className="story-object-example">
        <span>承接示例 / NOT A FICTIONAL PRODUCT CLAIM</span>
        <p>
          某章经 Founder 确认出现一条丝巾的场景 → 章节结尾标注“故事中的作品” → 进入
          <Link href="/products/chuyu">初羽作品详情</Link> → 按详情页真实状态显示“即将上架”或官方微店/预约入口。
        </p>
      </div>
    </section>
  );
}

export function ProductDetailPage({ product }: { product: CommerceProduct }) {
  return (
    <CommerceLayout>
      <section className="product-detail-hero section-pad">
        <div className={`product-detail-media ${!product.image ? "is-text-only" : ""}`}>
          {product.image ? (
            <img src={product.image} alt={product.alt ?? product.title} />
          ) : (
            <div className="commerce-placeholder-content">
              <span>{product.collectionLabel}</span>
              <strong>{product.title}</strong>
              <small>FORMAL ASSET PENDING</small>
            </div>
          )}
          <span className="commerce-asset-label">{product.assetType}</span>
        </div>
        <div className="product-detail-heading">
          <p className="eyebrow">01 / WORK HERO</p>
          <p className="card-kicker">{product.collectionLabel}</p>
          <h1>{product.title}</h1>
          <p className="product-detail-english">{product.english}</p>
          <p className="product-detail-lede">{product.copy}</p>
          <AvailabilityBadge product={product} />
          <AvailabilityAction product={product} />
        </div>
      </section>

      <section className="product-detail-sections section-pad" aria-label={`${product.title}作品详情`}>
        <DetailBlock index="02" title="作品名称与系列">
          <p>{product.title} 属于 {product.collectionLabel}。</p>
          <p className="detail-muted">{product.english}</p>
        </DetailBlock>
        <DetailBlock index="03" title="设计理念">
          <p>{product.designIdea}</p>
        </DetailBlock>
        <DetailBlock index="04" title="Cultural Source｜文化来源">
          <p>{product.culturalSource}</p>
        </DetailBlock>
        <DetailBlock index="05" title="Pattern Detail｜纹样细节">
          <p>{product.patternDetail}</p>
        </DetailBlock>
        <DetailBlock index="06" title="Contemporary Translation｜当代转译">
          <p>{product.contemporaryTranslation}</p>
        </DetailBlock>
        <DetailBlock index="07" title="材质、规格与工艺">
          <ul className="detail-material-list">
            {product.materials.map((material) => (
              <li key={material}>{material}</li>
            ))}
          </ul>
          <p className="detail-muted">以上仅展示当前已确认的设计资料；渲染图不代表现货实拍或已完成交付。</p>
        </DetailBlock>
        <DetailBlock index="08" title="当前作品状态">
          <p>{product.status}</p>
          <p className="detail-muted">产品视觉属性：{product.assetType}。</p>
        </DetailBlock>
        <DetailBlock index="09" title="可获得方式">
          <p>
            {product.availabilityKind === "reservation"
              ? "这是需要确认尺寸、材质或设计方案的高价值/定制作品，进入预约流程。"
              : product.availabilityKind === "store"
                ? "标准商品进入官方微店完成交易。"
                : "当前尚未取得正式商品详情链接，暂不开放购买或预约按钮。"}
          </p>
        </DetailBlock>
        <DetailBlock index="10" title="相关故事">
          <p>
            小说章节可以承接作品出现的场景与情绪；故事内容与产品信息分区，不改变文学剧情，也不把章节写成广告。
          </p>
          <Link className="inline-link" href="/#journal">
            进入设计手记 <span aria-hidden="true">↗</span>
          </Link>
        </DetailBlock>
        <DetailBlock index="11" title="购买或预约 CTA">
          <AvailabilityAction product={product} />
        </DetailBlock>
        <DetailBlock index="12" title="交易与状态说明">
          <p>
            标准商品的最终售价、实时库存、配送、运费、发货、退款、售后与订单状态，以凤启东方官方微店为唯一准源。官网不维护独立购物车、支付、订单、库存或售后后台。
          </p>
        </DetailBlock>
      </section>
    </CommerceLayout>
  );
}

function DetailBlock({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="product-detail-block">
      <span className="product-detail-index">{index}</span>
      <h2>{title}</h2>
      <div>{children}</div>
    </article>
  );
}
