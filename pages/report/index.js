const repository = require('../../services/repository')
const session = require('../../services/session')
const { dateLabel } = require('../../utils/date')

Page({
  data: { report: null, student: null, family: null, dateLabel: '', saved: true, userRole: '' },
  onLoad(options) {
    const user = session.guard(['family_user', 'admin'])
    if (!user) return
    const report = repository.getById('reports', options.id)
    if (!report) return wx.showToast({ title: '报告不存在', icon: 'none' })
    const assessment = repository.getById('assessments', report.assessment_id)
    const student = repository.getById('students', assessment.student_id)
    const family = repository.getById('families', student.family_id)
    if (user.role === 'family_user' && family.user_id !== user.id) return wx.reLaunch({ url: '/pages/home/index' })
    this.setData({ report, student, family, dateLabel: dateLabel(report.created_at), userRole: user.role })
  },
  save() { wx.showToast({ title: '已保存在 Family OS', icon: 'success' }) },
  contact() { wx.navigateTo({ url: '/pages/advisor-request/index' }) },
  home() { wx.switchTab({ url: '/pages/home/index' }) }
})
