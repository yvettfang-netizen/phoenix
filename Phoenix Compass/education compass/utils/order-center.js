const { dateTimeLabel } = require('./date')
const { statusLabel } = require('../services/payment')
const CLOSED = ['REFUNDED', 'REFUNDING', 'FAILED', 'CANCELLED', 'EXPIRED']
const PENDING = ['CREATED', 'PENDING', 'PAYING']
function toView(order, demo = false) {
  const status = order.status
  const student = order.studentName ? `${order.studentName}${order.studentDeleted ? '（档案已删除）' : ''}` : ''
  const timestamp = order.paidAt || order.createdAt
  const when = timestamp ? dateTimeLabel(timestamp) : ''
  const amount = order.amountFen
  return {
    orderId: order.orderId, reportId: order.reportId || '', status,
    canViewReport: order.canViewReport === true || (demo && status === 'PAID'),
    productLabel: 'Education Compass 完整成长报告',
    statusLabel: statusLabel(status),
    statusTone: status === 'PAID' ? 'paid' : CLOSED.includes(status) ? 'closed' : 'pending',
    amountLabel: Number.isSafeInteger(amount) && amount >= 0 && order.currency === 'CNY' ? `¥${(amount / 100).toFixed(2)}` : '金额待核实',
    metaLabel: [student, when].filter(Boolean).join(' · ') || '时间待确认'
  }
}
function destination(order) {
  if (!order || !order.orderId || !order.reportId) return ''
  const reportId = encodeURIComponent(order.reportId)
  if (order.status === 'PAID') return order.canViewReport === true ? `/pages/report/index?id=${reportId}` : ''
  if (PENDING.includes(order.status)) return `/pages/payment-result/index?orderId=${encodeURIComponent(order.orderId)}&reportId=${reportId}`
  return ''
}
module.exports = { toView, destination }
