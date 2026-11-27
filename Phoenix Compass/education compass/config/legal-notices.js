// C2_POLICY_APPROVAL_RECORD_20261119: product copy approved, professional review HOLD.
// Read-only review candidate; not a signed legal agreement, consent grant or production release.
const runtime = require('./runtime')
const copies = Object.freeze({
  guardian: "我已了解本测评用于形成教育成长快照与下一步支持建议。我确认有权为该家庭／未成年学生管理必要资料，并同意系统按隐私说明保存版本化问卷与结果。我可以撤回非必要授权；撤回不会被解释为学生能力或意愿不足。",
  student: "这份测评需要由我本人作答。我知道可以暂停、退出或不回答选填成绩区间，也不会因此得到负面评价。我同意系统用本次回答生成成长快照；如果不愿继续，我可以现在退出。",
  ai: "我同意将去标识化的结构化测评结果发送给受控 AI 服务作解释。AI 不会决定核心结果，也不得生成诊断、排名、录取概率或无来源事实。我可以不启用或之后撤回该功能。"
})
const notices = Object.freeze({
  terms: {
    title: '用户协议 · 产品服务说明（审阅候选）',
    sections: [
      { title: '服务范围', body: '匿名免费初评提供成长快照及下一步教育支持建议，不构成诊断、能力排名、录取预测或结果保证。深度测评和付费报告依照独立产品与权限规则提供。' },
      { title: '购买与退款', body: '学生提交测评后方可购买相应报告。以服务端核验的订单及有效权益为准；退款成功后撤回相应报告与 PDF 访问权益。历史商品和新商品不互换权益。退款问题请联系授权客服。' },
      { title: '授权与个人资料', body: '监护人同意、学生本人自愿作答、AI、顾问联系及其他非必要用途须分别核验，不因支付或浏览本页自动授予权限。请同时阅读正式隐私政策。' }
    ]
  },
  'ai-report': {
    title: 'AI 报告声明（审阅候选）',
    sections: [
      { title: 'AI 解释范围', body: copies.ai },
      { title: '核心结果', body: '核心报告由确定性规则生成；AI 不替代专业判断。未获实际服务、隐私与运行审批前，相关入口保持关闭。' },
      { title: '撤回', body: 'AI 分析须单独授权，可在原有授权与撤回界面管理。浏览本页不会产生同意。' }
    ]
  },
  'guardian-consent': {
    title: '监护人同意与学生自愿作答（审阅候选）',
    sections: [
      { title: '监护人核心测评同意', version: 'guardian_core_assessment_v1.0.0-rc1', body: copies.guardian },
      { title: '学生本人 Assent', version: 'student_assent_growth_discovery_v1.0.0-rc1', body: copies.student },
      { title: '独立授权', body: '两项文本分别适用对应功能；学生拒绝或退出不得解释为能力不足。本页只读，不代表已取得监护权证明、学生同意或其他资料使用授权。' }
    ]
  }
})
function available() { return ['develop', 'test'].includes(runtime.accountEnvironment()) }
function getNotice(type) { return Object.hasOwnProperty.call(notices, type) ? notices[type] : null }
module.exports = { available, getNotice, copies }
