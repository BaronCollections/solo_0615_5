import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getInitialApplications,
  addApplication,
  saveApplications,
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
