import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getInitialApplications,
  addApplication,
  saveApplications,
  withdrawApplication,
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
})
