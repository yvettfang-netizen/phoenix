import MobileMenu from "./mobile-menu";

export function BrandMark({ footer = false }: { footer?: boolean }) {
  return <img className={footer ? "brand-logo footer-logo" : "brand-logo"} src="/assets/wiswealth-logo-transparent.png" alt="WisWealth Family Office Limited 智富家办有限公司" />;
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="header-brand" href="/" aria-label="返回智富家办首页"><BrandMark /></a>
      <nav className="desktop-nav" aria-label="主要导航">
        <a href="/about">企业理念</a>
        <a href="/#services">服务领域</a>
        <a href="/methodology">规划方法</a>
        <a href="/insights">智富洞察</a>
      </nav>
      <a className="header-action" href="/#contact">预约初步沟通</a>
      <MobileMenu />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer" id="footer-contact">
      <div className="footer-main">
        <div className="footer-brand">
          <a href="/" aria-label="返回智富家办首页"><BrandMark footer /></a>
          <p>Wisdom · Wealth · Health</p>
        </div>
        <div className="footer-contact-grid">
          <div><span>Shenzhen</span><address>深圳市罗湖区和平路<br />金田大厦 2201</address></div>
          <div><span>Hong Kong</span><address>香港九龙广东道<br />新港中心 2 座 703</address></div>
          <div><span>Telephone</span><a href="tel:+8615323462868">+86 153 2346 2868</a><a href="tel:+85291927131">+852 9192 7131</a></div>
          <div><span>Email</span><a href="mailto:info@wwfo.online">info@wwfo.online</a><a href="https://www.wwfo.online">www.wwfo.online</a></div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 WisWealth Family Office Limited</p>
        <small>本网站内容仅供一般信息及规划沟通，不构成投资、法律、税务、移民或医疗意见。</small>
      </div>
    </footer>
  );
}

export function PageHero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <section className="page-hero">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
    </section>
  );
}
