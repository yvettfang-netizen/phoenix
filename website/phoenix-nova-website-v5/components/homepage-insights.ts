type Copy = readonly [string, string];

type Insight = {
  category: Copy;
  title: Copy;
  publisher: Copy;
  date: string;
  release: string;
  photo: string;
};

// Government Information Services releases. The dates and photos come from the linked notices.
export const homepageInsights = [
  {
    category: ["香港升学", "Hong Kong Admissions"],
    title: ["教资会赴欧洲推广「留学香港」", "UGC promotes Study in Hong Kong in Europe"],
    publisher: ["大学教育资助委员会", "University Grants Committee"],
    date: "2026-09-25",
    release: "202609/25/P2026092500378",
    photo: "1339481",
  },
  {
    category: ["身份政策", "Immigration & Talent"],
    title: ["香港人才服务办公室举办来港人才交流会", "Hong Kong Talent Engage connects incoming talent"],
    publisher: ["香港人才服务办公室", "Hong Kong Talent Engage"],
    date: "2026-11-06",
    release: "202611/06/P2026110600221",
    photo: "1342966",
  },
  {
    category: ["全球教育", "Global Education"],
    title: ["香港卓越奖学金颁予 61 名学生", "61 students receive Hong Kong Scholarships for Excellence"],
    publisher: ["香港教育局", "Education Bureau"],
    date: "2026-08-26",
    release: "202608/26/P2026082600439",
    photo: "1337179",
  },
  {
    category: ["财富趋势", "Wealth Trends"],
    title: ["金管局举办第五届国际金融领袖投资峰会", "HKMA hosts the fifth Global Financial Leaders’ Investment Summit"],
    publisher: ["香港金融管理局", "Hong Kong Monetary Authority"],
    date: "2026-11-03",
    release: "202611/03/P2026110300367",
    photo: "1342789",
  },
  {
    category: ["健康与医疗", "Health & Care"],
    title: ["香港公布《应对高龄社会策略报告》", "Hong Kong publishes its Report on Ageing Society Strategies"],
    publisher: ["香港特区政府", "HKSAR Government"],
    date: "2026-09-18",
    release: "202609/18/P2026091800542",
    photo: "1338971",
  },
] as const satisfies readonly Insight[];
