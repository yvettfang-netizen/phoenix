import Link from "next/link";
import styles from "./identity-landing.module.css";

export function CbiLandingEntry({ locale }: { locale: "zh" | "en" }) {
  const zh = locale === "zh";
  return <section className={styles.section} id="citizenship-explorer" aria-labelledby="citizenship-explorer-title">
    <div className={styles.container}>
      <h2 id="citizenship-explorer-title">{zh ? "全球投资入籍与第二身份规划" : "Global Citizenship by Investment & Second Citizenship Planning"}</h2>
      <p>{zh ? "了解不同国家依法设立的投资入籍及投资取得国籍制度，从法律依据、投资方式、家庭申请、居住要求及护照权益等方面进行比较，为家庭提供更加清晰的第二身份规划参考。" : "Explore citizenship by investment and investment-based nationality frameworks through their legal basis, investment routes, family eligibility, residence conditions and passport requirements, with a clearer reference for family planning."}</p>
      <p>{zh ? "护照是在取得国籍并满足签发条件后，由国家主管机关签发的旅行证件。投资款项并不等于直接购买护照。居留、永久居留、国籍、公民身份、护照、旅行证件与签证须分别核验。" : "A passport is a travel document issued by the competent national authority after nationality and passport-issuance requirements are satisfied. Investment does not directly purchase a passport. Residence, permanent residence, nationality, citizenship status, passports, travel documents and visas require separate verification."}</p>
      <p>{zh ? "首批资料范围仅包括圣基茨和尼维斯、阿根廷、瓦努阿图、圣多美和普林西比。资料正在核验，尚未发布；项目是否开放以官方核验及审核结果为准。" : "The initial review covers only Saint Kitts and Nevis, Argentina, Vanuatu, and São Tomé and Príncipe. Records remain under verification and are not published. Application availability requires official verification and editorial approval."}</p>
      <Link className={styles.textLink} href={`/${locale}/identity/explorer`}>{zh ? "进入精选国家检索中心" : "Explore the selected-country centre"} ↗</Link>
    </div>
  </section>;
}
