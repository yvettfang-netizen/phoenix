const notices = require('../../config/legal-notices')
Page({
  data: { title: '', sections: [], unavailable: true },
  onLoad(options) {
    if (!notices.available()) return
    const notice = notices.getNotice(options && options.type)
    if (!notice) return
    this.setData({ title: notice.title, sections: notice.sections, unavailable: false })
    if (wx.setNavigationBarTitle) wx.setNavigationBarTitle({ title: '协议与隐私说明' })
  }
})
