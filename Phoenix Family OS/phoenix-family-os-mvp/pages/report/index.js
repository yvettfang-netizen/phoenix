const repository = require('../../services/repository')
const session = require('../../services/session')
const { dateLabel } = require('../../utils/date')

Page({
  data: {
    report: null, blueprint: null, student: null, family: null, dateLabel: '', saved: true,
    userRole: '', errorMessage: ''
  },
  onLoad(options = {}) {
    const user = session.guard(['family_user', 'admin'])
    if (!user) return
    const report = repository.getById('reports', options.id)
    const blueprint = options.blueprintId
      ? repository.getById('growthBlueprints', options.blueprintId)
      : repository.growthBlueprintForReport(options.id)
    const assessment = report ? repository.getById('assessments', report.assessment_id) : null
    const student = assessment ? repository.getById('students', assessment.student_id) : null
    const family = student ? repository.getById('families', student.family_id) : null
    if (!report || !assessment || !student || !family || !report.summary || !report.recommendation) {
      this.setData({ userRole: user.role, errorMessage: '报告不存在或数据关联不完整，请返回后重试。' })
      return
    }
    if (user.role === 'family_user' && family.user_id !== user.id) return wx.reLaunch({ url: '/pages/home/index' })
    const accessibleBlueprint = blueprint && blueprint.family_id === family.id && blueprint.student_id === student.id && blueprint.source_report_id === report.id
      ? blueprint
      : null
    this.setData({ report, blueprint: accessibleBlueprint, student, family, dateLabel: dateLabel(report.created_at), userRole: user.role, errorMessage: '' })
  },
  save() { wx.showToast({ title: '已保存在 Family OS', icon: 'success' }) },
  viewBlueprint() {
    if (this.data.blueprint) wx.navigateTo({ url: `/pages/blueprint/index?id=${this.data.blueprint.id}` })
  },
  contact() { wx.navigateTo({ url: '/pages/advisor-request/index' }) },
  home() { wx.switchTab({ url: '/pages/home/index' }) },
  leaveError() {
    if (this.data.userRole === 'admin') {
      return wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/admin-families/index' }) })
    }
    wx.switchTab({ url: '/pages/home/index' })
  }
})
