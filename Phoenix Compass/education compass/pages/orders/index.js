const session = require('../../services/session')
const auth = require('../../services/auth')
const payment = require('../../services/payment')
const runtime = require('../../config/runtime')
const { toView, destination } = require('../../utils/order-center')

function familyUser() {
  const user = session.currentUser()
  return user && user.role === 'family_user' ? user : null
}

Page({
  data: { needLogin: true, loading: false, loginBusy: false, orders: [], orderCount: 0, error: '', isDemo: runtime.isDemo() },
  onShow() {
    this.visible = true
    this.setData({ needLogin: !familyUser(), orders: [], orderCount: 0, error: '' })
    if (familyUser()) this.load()
  },
  onHide() {
    this.visible = false
    this.loadRevision = (this.loadRevision || 0) + 1
    this.setData({ orders: [], orderCount: 0, loading: false, loginBusy: false, error: '' })
  },
  onUnload() { this.onHide() },
  async load() {
    const user = familyUser()
    if (!this.visible || !user) return
    const revision = this.loadRevision = (this.loadRevision || 0) + 1
    const current = () => this.visible && this.loadRevision === revision && familyUser()?.id === user.id
    this.setData({ loading: true, orders: [], orderCount: 0, error: '' })
    try {
      const orders = (await payment.listOrders()).map(order => toView(order, runtime.isDemo()))
      if (current()) this.setData({ orders, orderCount: orders.length, loading: false })
    } catch (error) {
      if (current()) this.setData({ error: '订单读取失败，请重试。', loading: false })
    }
  },
  async login() {
    if (!this.visible || this.data.loginBusy) return
    this.setData({ loginBusy: true, error: '' })
    try {
      const user = await auth.loginFamilyUser()
      if (!user || user.role !== 'family_user') { auth.logout(); throw new Error('本页仅面向家庭用户') }
      if (this.visible) { this.setData({ loginBusy: false, needLogin: false }); await this.load() }
    } catch (error) {
      if (this.visible) this.setData({ loginBusy: false, error: '登录未完成，请重试。' })
    }
  },
  openOrder({ currentTarget }) {
    if (!this.visible || !familyUser()) return
    const order = this.data.orders.find(item => item.orderId === currentTarget.dataset.id)
    const url = destination(order)
    if (url) return wx.navigateTo({ url })
    wx.showToast({ title: '该订单当前没有可查看的报告，请联系客服', icon: 'none' })
  },
  goCompass() { wx.navigateTo({ url: '/pages/compass/index' }) }
})
