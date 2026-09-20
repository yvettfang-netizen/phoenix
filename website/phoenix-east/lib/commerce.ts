export type CommerceCollection =
  | "silk"
  | "jewellery"
  | "for-him"
  | "eastern-living"
  | "gift-sets";

export type AvailabilityKind = "store" | "reservation" | "coming-soon";
export type JewelleryMetalTone = "gold" | "silver";

export type CommerceProduct = {
  slug: string;
  collection: CommerceCollection;
  title: string;
  english: string;
  collectionLabel: string;
  copy: string;
  designIdea: string;
  culturalSource: string;
  patternDetail: string;
  contemporaryTranslation: string;
  materials: string[];
  status: string;
  availability: string;
  availabilityKind: AvailabilityKind;
  assetType: string;
  metalTone?: JewelleryMetalTone;
  image?: string;
  alt?: string;
  storeUrl?: string;
};

export const collectionDefinitions: Array<{
  slug: CommerceCollection;
  label: string;
  english: string;
  href: string;
  summary: string;
}> = [
  {
    slug: "silk",
    label: "丝织",
    english: "SILK",
    href: "/silk",
    summary: "从初羽到锦羽，四章展开一条可携带的文化线。",
  },
  {
    slug: "jewellery",
    label: "珠宝",
    english: "JEWELLERY",
    href: "/jewellery",
    summary: "凤凰羽翼、金属与光，成为靠近身体的当代作品。",
  },
  {
    slug: "for-him",
    label: "男士礼物",
    english: "FOR HIM",
    href: "/collections/for-him",
    summary: "克制、深色、低饱和的男士配饰与跨界设计。",
  },
  {
    slug: "eastern-living",
    label: "东方生活",
    english: "EASTERN LIVING",
    href: "/collections/eastern-living",
    summary: "已经完成设计并确认供应后，再进入日常生活。",
  },
  {
    slug: "gift-sets",
    label: "东方礼盒",
    english: "GIFT SETS",
    href: "/collections/gift-sets",
    summary: "只组合已经正式存在、拥有真实资料的作品。",
  },
];

export const products: CommerceProduct[] = [
  {
    slug: "chuyu",
    collection: "silk",
    title: "初羽",
    english: "BEGINNING",
    collectionLabel: "丝织四章 / SILK CHAPTERS",
    copy: "一片初生的羽翼，承载每一次新的启程。",
    designIdea:
      "从第一片羽开始，把起身的光、金线的方向与可以被携带的轻盈，收进一条丝织轮廓。",
    culturalSource:
      "畲锦窄带的菱格与间隔节奏，是这一章的结构来源；文化花星、珠点与针脚留在羽纹细节中。",
    patternDetail:
      "羽片内部保留织纹、花星与珠点的节奏，纹样不铺满画面，而在边缘与局部光泽中被辨认。",
    contemporaryTranslation:
      "将传统织带的秩序缩放为一件可以围系、携带、反复使用的当代丝织作品。",
    materials: ["丝织设计样稿", "10 × 120 cm", "羽纹与金线细节"],
    status: "Design Developed｜设计已完成",
    availability: "Coming Soon｜即将上架",
    availabilityKind: "coming-soon",
    assetType: "Design Rendering / Pattern Study",
    image: "/assets/chuyu-silk.png",
    alt: "初羽 BEGINNING 丝织设计样稿，含凤凰羽纹、深蓝底色与金线细节",
  },
  {
    slug: "fengqi",
    collection: "silk",
    title: "凤起",
    english: "RISING",
    collectionLabel: "丝织四章 / SILK CHAPTERS",
    copy: "让金线从传统边界中起势。",
    designIdea:
      "第二章从上升的动作开始，让织纹不只是被观看的图案，而成为一条有方向的线。",
    culturalSource:
      "以畲锦几何间隔节奏、文化花星与羽片结构作为研究线索，保留来源，不复制原图。",
    patternDetail:
      "菱形结构与细密针脚只在需要被看见的位置出现，形成向上的视觉呼吸。",
    contemporaryTranslation:
      "把‘起势’转译成轻盈的丝织节奏，等待正式视觉资产与供应信息确认后公开。",
    materials: ["丝织系列设计", "正式视觉待补齐", "供应状态待确认"],
    status: "Design Concept｜设计概念",
    availability: "Coming Soon｜即将上架",
    availabilityKind: "coming-soon",
    assetType: "Design Rendering / Pattern Board",
    image: "/assets/silk/phoenix-rising-silk-board.png",
    alt: "凤起 RISING 凤凰羽纹丝巾正式视觉设计板",
  },
  {
    slug: "shanhai",
    collection: "silk",
    title: "山海",
    english: "MOUNTAINS TO SEA",
    collectionLabel: "丝织四章 / SILK CHAPTERS",
    copy: "把地理与记忆，织进可以携带的日常。",
    designIdea:
      "从山的起伏到海的展开，让一条丝织成为人与远方之间可以被携带的距离。",
    culturalSource:
      "以潮州文化土壤、海山地理记忆与正式文化纹样组件作为研究方向。",
    patternDetail:
      "纹样以边框、间隔与局部节奏出现，保留留白，不制作满版民族风背景。",
    contemporaryTranslation:
      "让地方经验进入日常尺度，成为可以被使用、被赠予、被继续讲述的丝织章节。",
    materials: ["丝织系列设计", "正式视觉待补齐", "供应状态待确认"],
    status: "Design Concept｜设计概念",
    availability: "Coming Soon｜即将上架",
    availabilityKind: "coming-soon",
    assetType: "Design Rendering / Pattern Board",
    image: "/assets/silk/phoenix-mountains-to-sea-silk-board.png",
    alt: "山海 MOUNTAINS TO SEA 丝巾正式视觉设计板",
  },
  {
    slug: "jinyu-silk",
    collection: "silk",
    title: "锦羽",
    english: "HERITAGE",
    collectionLabel: "丝织四章 / SILK CHAPTERS",
    copy: "从一片羽翼，到一段可以被继续讲述的传承。",
    designIdea:
      "锦羽把经纬与羽翼放在同一条文化线上，寻找传统进入当代生活后仍然成立的轮廓。",
    culturalSource:
      "使用已确认的 Phoenix Heritage Visual System 与畲族纹样研究线索，强调结构与节奏，而非装饰堆叠。",
    patternDetail:
      "文化羽纹、花星、珠点与针脚成为局部细节；NOVA WEAVE 以边缘秩序出现。",
    contemporaryTranslation:
      "把 heritage 变成可佩戴、可收藏、可传承的丝织作品，并以正式 V1.1 视觉为后续发布准源。",
    materials: ["丝织系列", "HERITAGE V1.1 视觉", "正式供应状态待确认"],
    status: "Design Developed｜设计已完成",
    availability: "Coming Soon｜即将上架",
    availabilityKind: "coming-soon",
    assetType: "Approved design direction / Formal product image pending",
  },
  {
    slug: "qicheng-ring",
    collection: "jewellery",
    title: "凤启·初光戒",
    english: "BEGINNING RING",
    collectionLabel: "凤凰珠宝 / JEWELLERY",
    copy: "凤凰展翼，以初光照亮每一次新的开始。",
    designIdea:
      "以凤凰展翼为灵感，主石象征启程的力量；尺寸、材质与制作方案仍需在预约中确认。",
    culturalSource:
      "凤凰羽翼为精神主角，文化羽纹与极细的结构线索只进入需要被看见的局部。",
    patternDetail:
      "开放式羽翼轮廓与金属线条形成对照；纹样不替代作品本身，而作为靠近佩戴者的内在细节。",
    contemporaryTranslation:
      "将凤凰意象转译成可以靠近身体的当代戒指，保留设计概念，不把渲染图称作现货成品。",
    materials: ["18K 黄金", "椭圆形蓝宝石（约 8 × 6 mm）", "天然钻石（碎钻）", "手工镶嵌"],
    status: "Design Developed｜设计已完成",
    availability: "Reservation Open｜开放预约",
    availabilityKind: "reservation",
    assetType: "Design Rendering",
    metalTone: "gold",
    image: "/assets/jewellery/phoenix-first-light-ring.png",
    alt: "凤启·初光戒设计图鉴，18K 黄金凤凰展翼蓝宝石戒指与多角度细节",
  },
  {
    slug: "jinyu-open-ring",
    collection: "jewellery",
    title: "锦羽珠宝",
    english: "JIN YU / OPEN RING",
    collectionLabel: "凤凰珠宝 / JEWELLERY",
    copy: "羽织光影，轻语相伴。一圈可以被日常佩戴、被记住的光。",
    designIdea:
      "让羽片像织物一样拥有经纬，让黄金与培育钻石共同保留轻盈、陪伴与自由。",
    culturalSource:
      "以 HERITAGE 羽纹、花星与 NOVA WEAVE 的几何间隔节奏作为局部研究来源。",
    patternDetail:
      "微镶光点沿羽翼结构展开，文化暗纹适合进入内圈或极细刻线，不做外部满版装饰。",
    contemporaryTranslation:
      "把织纹的节奏转成可以被日常使用的金属轮廓，先展示正式设计，再等待官方商品信息。",
    materials: ["18K 黄金", "培育钻石 Pavé", "可调节开放式戒"],
    status: "Design Developed｜设计已完成",
    availability: "Coming Soon｜即将上架",
    availabilityKind: "coming-soon",
    assetType: "Design Rendering",
    metalTone: "gold",
    image: "/assets/jinyu-gold-open-ring.png",
    alt: "锦羽系列 18K 黄金羽翼开放式戒指设计图鉴",
  },
  {
    slug: "jinyu-platinum-10ct",
    collection: "jewellery",
    title: "锦羽·铂金十克拉",
    english: "JIN YU / PLATINUM 10CT",
    collectionLabel: "凤凰珠宝 / JEWELLERY",
    copy: "以凤凰羽翼托起一颗盛大的光，让自由、轻盈与永恒同时抵达。",
    designIdea:
      "大克拉培育钻石不是炫耀性的中心，而是被羽翼托住的一束光；它需要预约确认尺寸、材质与制作方案。",
    culturalSource:
      "羽翼结构与文化纹样暗线共同承担支撑关系，畲族纹样只作为被审核的局部刻线与内在秩序。",
    patternDetail:
      "羽片、金属线条与光的层次被分开处理，避免把设计渲染误读为实物摄影。",
    contemporaryTranslation:
      "把盛大的光收进一件仍然保持开放感的当代珠宝，进入一对一预约与定制确认流程。",
    materials: ["Pt950 铂金", "10.00ct 培育钻", "定制方案确认"],
    status: "Design Developed｜设计已完成",
    availability: "Reservation Open｜开放预约",
    availabilityKind: "reservation",
    assetType: "Design Rendering",
    metalTone: "silver",
    image: "/assets/jinyu-platinum-10ct-ring.png",
    alt: "锦羽系列 Pt950 铂金十克拉培育钻凤凰羽翼戒指设计图鉴",
  },
  {
    slug: "feng-huang",
    collection: "jewellery",
    title: "凤与凰系列",
    english: "FENG & HUANG",
    collectionLabel: "凤凰珠宝 / JEWELLERY",
    copy: "凤求凰的相遇，凤舞九天的共同展开。两枚戒指各自成光，也在合璧时共同展开。",
    designIdea:
      "凤戒承接守护、定力与方向；凰戒承接自由、灵动与光芒。它们以不同姿态共同进入‘凤求凰’与‘凤舞九天’的故事。",
    culturalSource:
      "凤凰作为唯一精神主角，羽翼、金属结构与内圈文化暗纹共同构成一对可被长期佩戴的关系。",
    patternDetail:
      "两枚戒指在单独佩戴时保持各自轮廓，合璧视图强调相互回应，而非制造新的图案系统。",
    contemporaryTranslation:
      "将传统故事转译为当代男女对戒的设计语言；尺寸、材质与最终定制方案由预约沟通确认。",
    materials: ["凤戒 / 男款", "凰戒 / 女款", "合璧视图 / 45° VIEW"],
    status: "Design Developed｜设计已完成",
    availability: "Reservation Open｜开放预约",
    availabilityKind: "reservation",
    assetType: "Design Rendering / Final approved set",
    metalTone: "silver",
    image: "/assets/phoenix-wedding-rings-final.png",
    alt: "凤与凰系列凤凰对戒最终设计套装，包含凤戒、凰戒、合璧视图与内圈刻字",
  },
  {
    slug: "aoyu-cufflinks",
    collection: "for-him",
    title: "鳌鱼袖扣",
    english: "AOYU CUFFLINKS",
    collectionLabel: "男士礼物 / FOR HIM",
    copy: "以更克制的方式，把东方意象带进男士日常。",
    designIdea:
      "鳌鱼作为跨界设计作品出现，服务于男士礼物集合，不取代凤凰与畲族文化的主叙事。",
    culturalSource: "东方意象与 Phoenix East 的金属、线条语言；不延伸为教育产品或内部体系故事。",
    patternDetail: "深色、低饱和的纹样方式，等待正式产品图与工艺资料完成后公开。",
    contemporaryTranslation: "先作为作品目录中的已确认方向保留，正式公开以前不使用近似商品图补位。",
    materials: ["正式材质待确认", "正式视觉待补齐", "供应状态待确认"],
    status: "Design Developed｜设计已完成",
    availability: "Coming Soon｜即将上架",
    availabilityKind: "coming-soon",
    assetType: "Approved name / Formal product asset pending",
  },
  {
    slug: "approved-tie",
    collection: "for-him",
    title: "已批准领带",
    english: "APPROVED TIE",
    collectionLabel: "男士礼物 / FOR HIM",
    copy: "保留一件正式男士配饰的位置，等真实视觉与供应资料到位。",
    designIdea: "以更安静的比例、深色与低饱和纹样承接 Phoenix East 的男士礼物方向。",
    culturalSource: "仅使用已经批准的设计方向与正式文化纹样组件，不自行扩展新图案。",
    patternDetail: "产品图片、材质与工艺标识尚未齐备，本版本只保留文字状态。",
    contemporaryTranslation: "在正式资料完成前，网站负责说明方向，不制造虚构的成品展示。",
    materials: ["正式材质待确认", "正式视觉待补齐", "供应状态待确认"],
    status: "Material Review｜材质确认中",
    availability: "Coming Soon｜即将上架",
    availabilityKind: "coming-soon",
    assetType: "Approved direction / Formal product asset pending",
  },
  {
    slug: "eastern-living-coming-soon",
    collection: "eastern-living",
    title: "东方生活作品",
    english: "EASTERN LIVING",
    collectionLabel: "东方生活 / EASTERN LIVING",
    copy: "已经完成设计、取得正式视觉资产并确认供应后，再进入日常生活。",
    designIdea: "这一集合为未来生活作品保留位置，不用虚构产品填充页面。",
    culturalSource: "后续作品需逐项完成文化来源、授权与当代转译说明。",
    patternDetail: "暂无可公开的正式产品资产；当前仅使用轻量纹样边框作为状态语言。",
    contemporaryTranslation: "先让用户知道这里会发生什么，再在真实作品准备好时开放。",
    materials: ["正式产品未确认", "真实样品未确认", "供应状态待确认"],
    status: "Coming Soon｜即将发布",
    availability: "Coming Soon｜即将上架",
    availabilityKind: "coming-soon",
    assetType: "No formal product asset in current release",
  },
  {
    slug: "gift-sets-coming-soon",
    collection: "gift-sets",
    title: "东方礼盒",
    english: "GIFT SETS",
    collectionLabel: "东方礼盒 / GIFT SETS",
    copy: "只组合已经正式存在的作品，等待真实包装或样品资料确认。",
    designIdea: "礼盒不是把普通产品图片临时拼贴在一起，而是一个需要独立成立的作品关系。",
    culturalSource: "包装边框、封套与内衬可以承接已审核的文化纹样，但不得自行设计新包装。",
    patternDetail: "当前没有 Founder 批准的正式礼盒视觉，本版本只显示文字状态。",
    contemporaryTranslation: "等丝巾、珠宝或男士礼物拥有真实组合资料后，再形成可获得的礼盒章节。",
    materials: ["正式包装未确认", "真实样品未确认", "供应状态待确认"],
    status: "Design Concept｜设计概念",
    availability: "Coming Soon｜即将上架",
    availabilityKind: "coming-soon",
    assetType: "No formal packaging asset in current release",
  },
];

export const silkAssetGallery = [
  {
    asset: "/assets/chuyu-silk.png",
    title: "初羽",
    english: "BEGINNING / TWILLY",
    assetType: "Design Rendering / Pattern Study",
    caption: "10 × 120 cm 初羽丝织设计样稿；凤凰羽纹、金线与畲锦节奏共同展开。",
  },
  {
    asset: "/assets/silk/phoenix-rising-silk-board.png",
    title: "凤起",
    english: "RISING",
    assetType: "Design Rendering / Pattern Board",
    caption: "凤凰起势的正式视觉板；金线、菱格、花星与珠点保留为局部文化线索。",
  },
  {
    asset: "/assets/silk/phoenix-mountains-to-sea-silk-board.png",
    title: "山海",
    english: "MOUNTAINS TO SEA",
    assetType: "Design Rendering / Pattern Board",
    caption: "山形、海浪、羽纹与远方共同形成的丝织视觉方向。",
  },
  {
    asset: "/assets/silk/phoenix-heritage-translation-plan.png",
    title: "文化来源与当代转译",
    english: "HERITAGE VISUAL SYSTEM V1.1",
    assetType: "Pattern Study / Cultural Source",
    caption: "记录文化来源、结构提取、当代转译与应用边界；不是商品实拍。",
  },
  {
    asset: "/assets/silk/phoenix-silk-wearing-portrait.png",
    title: "丝巾佩戴参考",
    english: "STYLING REFERENCE",
    assetType: "Styling Reference / Not Product Photograph",
    caption: "佩戴方式参考，不代表实物照片、库存、量产或已完成交付。",
  },
];

export const getProductsByCollection = (collection: CommerceCollection) =>
  products.filter((product) => product.collection === collection);

export const getProductBySlug = (slug: string) =>
  products.find((product) => product.slug === slug);

export const officialAssetInventory = [
  {
    asset: "/assets/phoenix-nova-logo.png",
    type: "Phoenix Nova™ Official Logo System V1.0",
    usage: "Header 与 Footer 官方 Logo",
    state: "Approved source",
  },
  {
    asset: "/assets/phoenix-east-hero.png",
    type: "Approved Phoenix asset",
    usage: "首页 Hero；不进入 Shop 商品图",
    state: "Approved Phoenix asset",
  },
  {
    asset: "/assets/chuyu-silk.png",
    type: "Design Rendering / Pattern Study",
    usage: "初羽与 Silk Collection 主视觉",
    state: "Approved design asset",
  },
  {
    asset: "/assets/jinyu-heritage.png",
    type: "Design Rendering",
    usage: "锦羽 HERITAGE 视觉与首页作品预览",
    state: "Founder-specified revision",
  },
  {
    asset: "/assets/jewellery/phoenix-first-light-ring.png",
    type: "Design Rendering",
    usage: "凤启·初光戒",
    state: "Founder-confirmed image",
  },
  {
    asset: "/assets/jinyu-gold-open-ring.png",
    type: "Design Rendering",
    usage: "锦羽珠宝",
    state: "Approved design asset",
  },
  {
    asset: "/assets/jinyu-platinum-10ct-ring.png",
    type: "Design Rendering",
    usage: "锦羽·铂金十克拉",
    state: "Approved design asset",
  },
  {
    asset: "/assets/phoenix-wedding-rings-final.png",
    type: "Design Rendering / Final approved set",
    usage: "凤与凰系列",
    state: "Approved final set",
  },
  {
    asset: "/assets/silk/phoenix-rising-silk-board.png",
    type: "Design Rendering / Pattern Board",
    usage: "凤起 RISING 丝织章节",
    state: "Founder-supplied formal asset",
  },
  {
    asset: "/assets/silk/phoenix-mountains-to-sea-silk-board.png",
    type: "Design Rendering / Pattern Board",
    usage: "山海 MOUNTAINS TO SEA 丝织章节",
    state: "Founder-supplied formal asset",
  },
  {
    asset: "/assets/silk/phoenix-heritage-translation-plan.png",
    type: "Pattern Study / Cultural Source",
    usage: "Heritage V1.1 文化来源与当代转译",
    state: "Founder-supplied formal asset",
  },
  {
    asset: "/assets/silk/phoenix-silk-wearing-portrait.png",
    type: "Styling Reference / Not Product Photograph",
    usage: "丝巾佩戴参考",
    state: "Approved reference asset",
  },
  {
    asset: "/assets/mobile-wallpaper-chuyu.png",
    type: "Free Wallpaper / Mobile Screen",
    usage: "初羽手机屏保免费下载",
    state: "Founder-supplied formal asset",
  },
];

export const missingCommerceAssets = [
  {
    asset: "官方微店商品详情页 URL",
    impact: "所有标准商品暂不能显示‘去官方微店购买’",
    action: "Founder 提供逐商品详情页链接后再映射",
  },
  {
    asset: "鳌鱼袖扣与已批准领带的正式产品图、材质与供应资料",
    impact: "For Him 只能显示文字状态",
    action: "补齐正式资产后再进入公开商品展示",
  },
  {
    asset: "东方生活正式产品资产",
    impact: "Eastern Living 保持 Coming Soon",
    action: "取得真实设计、样品与供应确认后再上架",
  },
  {
    asset: "东方礼盒包装设计或真实样品资料",
    impact: "Gift Sets 保持 Coming Soon",
    action: "不得用普通产品图临时拼贴礼盒",
  },
];
