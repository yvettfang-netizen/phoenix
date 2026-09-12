const repository = require('../../services/repository')
const session = require('../../services/session')
const { dateLabel } = require('../../utils/date')

Page({
  data: {
    blueprint: null,
    report: null,
    student: null,
    family: null,
    dateLabel: '',
    userRole: '',
    errorMessage: ''
  },

  onLoad(options = {}) {
    const user = session.guard(['family_user', 'admin'])
    if (!user) return

    const familyForUser = user.role === 'family_user' ? repository.familyForUser(user.id) : null
    const blueprint = options.id
      ? repository.getById('growthBlueprints', options.id)
      : options.reportId
        ? repository.growthBlueprintForReport(options.reportId)
        : familyForUser
          ? repository.growthBlueprintsForFamily(familyForUser.id)[0]
          : null
    const student = blueprint ? repository.getById('students', blueprint.student_id) : null
    const family = student ? repository.getById('families', student.family_id) : null
    const report = blueprint ? repository.getById('reports', blueprint.source_report_id) : null
    const assessment = report ? repository.getById('assessments', report.assessment_id) : null

    if (!blueprint || !student || !family || !report || !assessment ||
        blueprint.family_id !== family.id || blueprint.student_id !== student.id ||
        report.assessment_id !== assessment.id || assessment.student_id !== student.id ||
        !blueprint.profile || !blueprint.growth_map || !blueprint.education_path || !blueprint.action_plan) {
      this.setData({ userRole: user.role, errorMessage: '成长蓝图不存在或数据关联不完整，请返回后重试。' })
      return
    }
    if (user.role === 'family_user' && family.user_id !== user.id) {
      return wx.reLaunch({ url: '/pages/home/index' })
    }
    this.setData({ blueprint, report, student, family, dateLabel: dateLabel(blueprint.updated_at || blueprint.created_at), userRole: user.role, errorMessage: '' })
  },

  viewReport() {
    if (this.data.report) wx.navigateTo({ url: `/pages/report/index?id=${this.data.report.id}` })
  },

  home() { wx.switchTab({ url: '/pages/home/index' }) },

  leaveError() {
    if (this.data.userRole === 'admin') {
      return wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/admin-families/index' }) })
    }
    wx.switchTab({ url: '/pages/home/index' })
  }
})
