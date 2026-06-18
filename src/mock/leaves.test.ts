import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getInitialApplications,
  addApplication,
  saveApplications,
  withdrawApplication,
  resubmitApplication,
  type LeaveApplication
} from './leaves'
import { LEAVE_RECORDS_KEY, hasLeaveRecordsKey } from '../utils/leaveStorage'

describe('leaves mock - localStorage 边界处理', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('首次访问（localStorage 为空）时加载默认数据并保存', () => {
    expect(localStorage.getItem(LEAVE_RECORDS_KEY)).toBeNull()

    const result = getInitialApplications()

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('status')
    expect(localStorage.getItem(LEAVE_RECORDS_KEY)).not.toBeNull()

    const saved = JSON.parse(localStorage.getItem(LEAVE_RECORDS_KEY)!)
    expect(saved).toEqual(result)
  })

  it('localStorage 为非法 JSON 时回退为空列表并写回 []', () => {
    localStorage.setItem(LEAVE_RECORDS_KEY, '{ this is invalid json !!!')

    const result = getInitialApplications()

    expect(Array.isArray(result)).toBe(true)
    expect(result).toEqual([])
    expect(hasLeaveRecordsKey()).toBe(true)
    expect(localStorage.getItem(LEAVE_RECORDS_KEY)).toBe('[]')
  })

  it('localStorage 为合法数据时正确读取', () => {
    const customData: LeaveApplication[] = [
      {
        id: 'L999',
        studentName: '自定义学生',
        className: '高三(5)班',
        courseName: '音乐',
        leaveType: '公假',
        startDate: '2026-07-01',
        endDate: '2026-07-02',
        reason: '参加演出',
        status: 'approved',
        rejectReason: '',
        submittedAt: '2026-06-20 10:00',
        approvedAt: '2026-06-21 09:00'
      }
    ]
    localStorage.setItem(LEAVE_RECORDS_KEY, JSON.stringify(customData))

    const result = getInitialApplications()

    expect(result).toEqual(customData)
  })

  it('localStorage 为空数组时正常返回空数组（不重置为默认数据）', () => {
    localStorage.setItem(LEAVE_RECORDS_KEY, '[]')

    const result = getInitialApplications()

    expect(result).toEqual([])
  })

  it('损坏数据后可正常新增请假申请', () => {
    localStorage.setItem(LEAVE_RECORDS_KEY, 'corrupted data here')

    let apps = getInitialApplications()
    expect(apps).toEqual([])

    const newApp = addApplication({
      studentName: '张同学',
      className: '高三(1)班',
      courseName: '数学',
      leaveType: '病假',
      startDate: '2026-06-20',
      endDate: '2026-06-21',
      reason: '测试新增',
      submittedAt: '2026-06-19 08:00'
    })

    expect(newApp).toBeDefined()
    expect(newApp.id).toBe('L001')
    expect(newApp.status).toBe('pending')

    apps = getInitialApplications()
    expect(apps.length).toBe(1)
    expect(apps[0]).toEqual(newApp)
  })

  it('损坏数据后教师可正常审批（保存更新）', () => {
    localStorage.setItem(LEAVE_RECORDS_KEY, 'not valid json')

    let apps = getInitialApplications()
    expect(apps).toEqual([])

    addApplication({
      studentName: '李同学',
      className: '高三(2)班',
      courseName: '语文',
      leaveType: '事假',
      startDate: '2026-06-20',
      endDate: '2026-06-20',
      reason: '教师审批测试',
      submittedAt: '2026-06-19 09:00'
    })

    apps = getInitialApplications()
    expect(apps.length).toBe(1)
    expect(apps[0].status).toBe('pending')

    apps[0].status = 'approved'
    apps[0].approvedAt = '2026-06-19 10:00'
    saveApplications(apps)

    const saved = getInitialApplications()
    expect(saved[0].status).toBe('approved')
    expect(saved[0].approvedAt).toBe('2026-06-19 10:00')
  })

  it('重复刷新（多次调用）保持空列表（不恢复默认数据）', () => {
    localStorage.setItem(LEAVE_RECORDS_KEY, 'broken')

    for (let i = 0; i < 5; i++) {
      const result = getInitialApplications()
      expect(result).toEqual([])
    }

    expect(localStorage.getItem(LEAVE_RECORDS_KEY)).toBe('[]')
  })
})

describe('leaves mock - 撤回功能', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('待审批（pending）的请假申请可以成功撤回', () => {
    const newApp = addApplication({
      studentName: '测试学生',
      className: '高三(1)班',
      courseName: '数学',
      leaveType: '病假',
      startDate: '2026-06-20',
      endDate: '2026-06-21',
      reason: '测试撤回',
      submittedAt: '2026-06-19 08:00'
    })
    expect(newApp.status).toBe('pending')

    const result = withdrawApplication(newApp.id)
    expect(result).toBe(true)

    const apps = getInitialApplications()
    const target = apps.find((a) => a.id === newApp.id)
    expect(target).toBeDefined()
    expect(target!.status).toBe('withdrawn')
  })

  it('撤回后数据写入 localStorage，刷新后保持一致', () => {
    const newApp = addApplication({
      studentName: '刷新测试',
      className: '高三(2)班',
      courseName: '语文',
      leaveType: '事假',
      startDate: '2026-06-22',
      endDate: '2026-06-22',
      reason: '测试刷新一致性',
      submittedAt: '2026-06-19 09:00'
    })

    withdrawApplication(newApp.id)

    const fromStorage = JSON.parse(localStorage.getItem(LEAVE_RECORDS_KEY)!)
    const stored = fromStorage.find((a: LeaveApplication) => a.id === newApp.id)
    expect(stored.status).toBe('withdrawn')

    const reloaded = getInitialApplications()
    const reloadedTarget = reloaded.find((a) => a.id === newApp.id)
    expect(reloadedTarget!.status).toBe('withdrawn')
  })

  it('已通过（approved）的请假申请无法撤回', () => {
    const newApp = addApplication({
      studentName: '已通过学生',
      className: '高三(3)班',
      courseName: '英语',
      leaveType: '公假',
      startDate: '2026-06-23',
      endDate: '2026-06-23',
      reason: '已通过不可撤回',
      submittedAt: '2026-06-19 10:00'
    })

    const apps = getInitialApplications()
    const target = apps.find((a) => a.id === newApp.id)!
    target.status = 'approved'
    target.approvedAt = '2026-06-19 11:00'
    saveApplications(apps)

    const result = withdrawApplication(newApp.id)
    expect(result).toBe(false)

    const recheck = getInitialApplications()
    expect(recheck.find((a) => a.id === newApp.id)!.status).toBe('approved')
  })

  it('已驳回（rejected）的请假申请无法撤回', () => {
    const newApp = addApplication({
      studentName: '已驳回学生',
      className: '高三(1)班',
      courseName: '物理',
      leaveType: '病假',
      startDate: '2026-06-24',
      endDate: '2026-06-24',
      reason: '已驳回不可撤回',
      submittedAt: '2026-06-19 12:00'
    })

    const apps = getInitialApplications()
    const target = apps.find((a) => a.id === newApp.id)!
    target.status = 'rejected'
    target.rejectReason = '驳回理由'
    target.approvedAt = '2026-06-19 13:00'
    saveApplications(apps)

    const result = withdrawApplication(newApp.id)
    expect(result).toBe(false)

    const recheck = getInitialApplications()
    expect(recheck.find((a) => a.id === newApp.id)!.status).toBe('rejected')
  })

  it('已撤回（withdrawn）的请假申请无法重复撤回', () => {
    const newApp = addApplication({
      studentName: '重复撤回测试',
      className: '高三(2)班',
      courseName: '化学',
      leaveType: '事假',
      startDate: '2026-06-25',
      endDate: '2026-06-25',
      reason: '重复撤回测试',
      submittedAt: '2026-06-19 14:00'
    })

    const first = withdrawApplication(newApp.id)
    expect(first).toBe(true)

    const second = withdrawApplication(newApp.id)
    expect(second).toBe(false)
  })

  it('不存在的申请 id 撤回失败，返回 false', () => {
    addApplication({
      studentName: '存在的学生',
      className: '高三(1)班',
      courseName: '数学',
      leaveType: '病假',
      startDate: '2026-06-26',
      endDate: '2026-06-26',
      reason: '存在的申请',
      submittedAt: '2026-06-19 15:00'
    })

    const result = withdrawApplication('L999')
    expect(result).toBe(false)
  })

  it('撤回后教师端待审批列表不再包含该申请', () => {
    localStorage.setItem(LEAVE_RECORDS_KEY, '[]')

    const app1 = addApplication({
      studentName: '学生A',
      className: '高三(1)班',
      courseName: '数学',
      leaveType: '病假',
      startDate: '2026-06-27',
      endDate: '2026-06-27',
      reason: '待撤回',
      submittedAt: '2026-06-19 16:00'
    })
    const app2 = addApplication({
      studentName: '学生B',
      className: '高三(1)班',
      courseName: '语文',
      leaveType: '事假',
      startDate: '2026-06-28',
      endDate: '2026-06-28',
      reason: '保持待审批',
      submittedAt: '2026-06-19 16:01'
    })

    withdrawApplication(app1.id)

    const all = getInitialApplications()
    const pending = all.filter((a) => a.status === 'pending')

    expect(pending.find((a) => a.id === app1.id)).toBeUndefined()
    expect(pending.find((a) => a.id === app2.id)).toBeDefined()
    expect(pending.length).toBe(1)
  })

  it('回归：学生新增待审批申请后撤回，教师端重新挂载后待审批列表不含该申请', () => {
    localStorage.setItem(LEAVE_RECORDS_KEY, '[]')

    const newApp = addApplication({
      studentName: '回归测试学生',
      className: '高三(2)班',
      courseName: '英语',
      leaveType: '事假',
      startDate: '2026-06-29',
      endDate: '2026-06-29',
      reason: '回归测试撤回后教师端不可见',
      submittedAt: '2026-06-18 08:00'
    })
    expect(newApp.status).toBe('pending')

    const withdrawResult = withdrawApplication(newApp.id)
    expect(withdrawResult).toBe(true)

    const fromStorage = JSON.parse(localStorage.getItem(LEAVE_RECORDS_KEY)!)
    const stored = fromStorage.find((a: LeaveApplication) => a.id === newApp.id)
    expect(stored.status).toBe('withdrawn')

    const all = getInitialApplications()
    const pending = all.filter((a) => a.status === 'pending')
    expect(pending.find((a) => a.id === newApp.id)).toBeUndefined()
  })
})

describe('leaves mock - 再次提交（已驳回重提）功能', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(LEAVE_RECORDS_KEY, '[]')
  })

  afterEach(() => {
    localStorage.clear()
  })

  const createRejectedApp = (overrides: Partial<LeaveApplication> = {}): LeaveApplication => {
    const newApp = addApplication({
      studentName: '张同学',
      className: '高三(1)班',
      courseName: '数学',
      leaveType: '病假',
      startDate: '2026-06-20',
      endDate: '2026-06-21',
      reason: '发烧需要休息',
      submittedAt: '2026-06-19 08:00'
    })
    const apps = getInitialApplications()
    const target = apps.find((a) => a.id === newApp.id)!
    target.status = 'rejected'
    target.rejectReason = '病假需提供医院证明'
    target.approvedAt = '2026-06-19 09:00'
    Object.assign(target, overrides)
    saveApplications(apps)
    return target
  }

  it('已驳回（rejected）的请假申请可以成功再次提交，生成新记录', () => {
    const rejected = createRejectedApp()
    const originalId = rejected.id

    const result = resubmitApplication(originalId)

    expect(result).not.toBeNull()
    expect(result!.id).not.toBe(originalId)
    expect(result!.status).toBe('pending')
    expect(result!.rejectReason).toBe('')
    expect(result!.approvedAt).toBe('')
  })

  it('再次提交后，原记录保持已驳回状态且驳回原因保留', () => {
    const rejected = createRejectedApp()
    const originalId = rejected.id
    const originalRejectReason = '病假需提供医院证明'

    resubmitApplication(originalId)

    const all = getInitialApplications()
    const original = all.find((a) => a.id === originalId)!
    expect(original.status).toBe('rejected')
    expect(original.rejectReason).toBe(originalRejectReason)
    expect(original.approvedAt).toBe('2026-06-19 09:00')
  })

  it('新记录内容（学生、班级、课程、请假类型、日期、原因）与原记录一致', () => {
    const rejected = createRejectedApp()

    const newApp = resubmitApplication(rejected.id)!

    expect(newApp.studentName).toBe(rejected.studentName)
    expect(newApp.className).toBe(rejected.className)
    expect(newApp.courseName).toBe(rejected.courseName)
    expect(newApp.leaveType).toBe(rejected.leaveType)
    expect(newApp.startDate).toBe(rejected.startDate)
    expect(newApp.endDate).toBe(rejected.endDate)
    expect(newApp.reason).toBe(rejected.reason)
  })

  it('新记录的提交时间是再次提交时的时间，与原记录不同', () => {
    const rejected = createRejectedApp()

    const newApp = resubmitApplication(rejected.id)!

    expect(newApp.submittedAt).not.toBe(rejected.submittedAt)
    expect(newApp.submittedAt.length).toBeGreaterThan(0)
  })

  it('新记录 ID 按规则递增（正确分配新编号）', () => {
    localStorage.setItem(LEAVE_RECORDS_KEY, '[]')

    const app1 = addApplication({
      studentName: '学生1',
      className: '高三(1)班',
      courseName: '数学',
      leaveType: '事假',
      startDate: '2026-06-20',
      endDate: '2026-06-20',
      reason: '测试1',
      submittedAt: '2026-06-19 08:00'
    })
    expect(app1.id).toBe('L001')

    const apps = getInitialApplications()
    apps[0].status = 'rejected'
    apps[0].rejectReason = '驳回理由'
    apps[0].approvedAt = '2026-06-19 09:00'
    saveApplications(apps)

    const newApp = resubmitApplication('L001')!
    expect(newApp.id).toBe('L002')
  })

  it('待审批（pending）状态的申请无法再次提交', () => {
    const pending = addApplication({
      studentName: '待审批学生',
      className: '高三(1)班',
      courseName: '数学',
      leaveType: '病假',
      startDate: '2026-06-20',
      endDate: '2026-06-20',
      reason: '待审批不可重提',
      submittedAt: '2026-06-19 08:00'
    })
    expect(pending.status).toBe('pending')

    const result = resubmitApplication(pending.id)
    expect(result).toBeNull()

    const all = getInitialApplications()
    expect(all.length).toBe(1)
    expect(all[0].status).toBe('pending')
  })

  it('已通过（approved）状态的申请无法再次提交', () => {
    const app = addApplication({
      studentName: '已通过学生',
      className: '高三(1)班',
      courseName: '数学',
      leaveType: '病假',
      startDate: '2026-06-20',
      endDate: '2026-06-20',
      reason: '已通过不可重提',
      submittedAt: '2026-06-19 08:00'
    })
    const apps = getInitialApplications()
    const target = apps.find((a) => a.id === app.id)!
    target.status = 'approved'
    target.approvedAt = '2026-06-19 09:00'
    saveApplications(apps)

    const result = resubmitApplication(app.id)
    expect(result).toBeNull()

    const all = getInitialApplications()
    expect(all.length).toBe(1)
    const recheck = all.find((a) => a.id === app.id)!
    expect(recheck.status).toBe('approved')
  })

  it('已撤回（withdrawn）状态的申请无法再次提交', () => {
    const app = addApplication({
      studentName: '已撤回学生',
      className: '高三(1)班',
      courseName: '数学',
      leaveType: '病假',
      startDate: '2026-06-20',
      endDate: '2026-06-20',
      reason: '已撤回不可重提',
      submittedAt: '2026-06-19 08:00'
    })
    withdrawApplication(app.id)

    const result = resubmitApplication(app.id)
    expect(result).toBeNull()

    const all = getInitialApplications()
    expect(all.length).toBe(1)
    const recheck = all.find((a) => a.id === app.id)!
    expect(recheck.status).toBe('withdrawn')
  })

  it('不存在的申请 ID 再次提交返回 null', () => {
    localStorage.setItem(LEAVE_RECORDS_KEY, '[]')
    addApplication({
      studentName: '存在的学生',
      className: '高三(1)班',
      courseName: '数学',
      leaveType: '病假',
      startDate: '2026-06-20',
      endDate: '2026-06-20',
      reason: '存在的申请',
      submittedAt: '2026-06-19 08:00'
    })

    const result = resubmitApplication('L999')
    expect(result).toBeNull()
  })

  it('教师端待审批列表只包含新生成的待审批申请，不含原驳回记录', () => {
    const rejected = createRejectedApp()

    const newApp = resubmitApplication(rejected.id)!

    const all = getInitialApplications()
    const pendingForTeacher = all.filter((a) => a.status === 'pending')

    expect(pendingForTeacher.length).toBe(1)
    expect(pendingForTeacher[0].id).toBe(newApp.id)
    expect(pendingForTeacher[0].status).toBe('pending')
    expect(pendingForTeacher.find((a) => a.id === rejected.id)).toBeUndefined()
  })

  it('再次提交后数据写入 localStorage，刷新后保持一致', () => {
    const rejected = createRejectedApp()

    const newApp = resubmitApplication(rejected.id)!

    const fromStorage = JSON.parse(localStorage.getItem(LEAVE_RECORDS_KEY)!)
    expect(fromStorage.length).toBe(2)

    const storedOriginal = fromStorage.find((a: LeaveApplication) => a.id === rejected.id)
    expect(storedOriginal).toBeDefined()
    expect(storedOriginal.status).toBe('rejected')
    expect(storedOriginal.rejectReason).toBe('病假需提供医院证明')

    const storedNew = fromStorage.find((a: LeaveApplication) => a.id === newApp.id)
    expect(storedNew).toBeDefined()
    expect(storedNew.status).toBe('pending')
    expect(storedNew.rejectReason).toBe('')

    const reloaded = getInitialApplications()
    expect(reloaded.length).toBe(2)
    expect(reloaded.find((a) => a.id === rejected.id)!.status).toBe('rejected')
    expect(reloaded.find((a) => a.id === newApp.id)!.status).toBe('pending')
  })

  it('支持多次驳回-再次提交流程，每次都生成新记录且历史驳回记录全部保留', () => {
    const first = createRejectedApp()
    const firstId = first.id

    const second = resubmitApplication(firstId)!
    expect(second.id).not.toBe(firstId)
    expect(second.status).toBe('pending')

    const apps1 = getInitialApplications()
    const target2 = apps1.find((a) => a.id === second.id)!
    target2.status = 'rejected'
    target2.rejectReason = '第二次驳回：仍缺少证明材料'
    target2.approvedAt = '2026-06-19 10:00'
    saveApplications(apps1)

    const third = resubmitApplication(second.id)!
    expect(third.id).not.toBe(second.id)
    expect(third.status).toBe('pending')

    const finalAll = getInitialApplications()
    expect(finalAll.length).toBe(3)

    const record1 = finalAll.find((a) => a.id === firstId)!
    expect(record1.status).toBe('rejected')
    expect(record1.rejectReason).toBe('病假需提供医院证明')

    const record2 = finalAll.find((a) => a.id === second.id)!
    expect(record2.status).toBe('rejected')
    expect(record2.rejectReason).toBe('第二次驳回：仍缺少证明材料')

    const record3 = finalAll.find((a) => a.id === third.id)!
    expect(record3.status).toBe('pending')
    expect(record3.rejectReason).toBe('')

    const pendingForTeacher = finalAll.filter((a) => a.status === 'pending')
    expect(pendingForTeacher.length).toBe(1)
    expect(pendingForTeacher[0].id).toBe(third.id)
  })

  it('学生端：再次提交后能同时看到原驳回记录（含原因）和新的待审批记录', () => {
    const rejected = createRejectedApp()

    resubmitApplication(rejected.id)

    const all = getInitialApplications()
    const studentRecords = all.filter((a) => a.studentName === '张同学')

    const rejectedRecord = studentRecords.find((a) => a.status === 'rejected')
    const pendingRecord = studentRecords.find((a) => a.status === 'pending')

    expect(rejectedRecord).toBeDefined()
    expect(rejectedRecord!.rejectReason).toBe('病假需提供医院证明')
    expect(pendingRecord).toBeDefined()
    expect(pendingRecord!.rejectReason).toBe('')
    expect(studentRecords.length).toBe(2)
  })
})
