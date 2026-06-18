import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getLeaveRecords,
  saveLeaveRecords,
  hasLeaveRecordsKey,
  LEAVE_RECORDS_KEY,
  CURRENT_USER_KEY,
  getCurrentUsername,
  setCurrentUsername,
  removeCurrentUser,
  type LeaveApplication
} from './leaveStorage'

describe('leaveStorage - 非法 JSON 容错处理', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('getLeaveRecords 当 localStorage 无值时返回 null', () => {
    expect(getLeaveRecords()).toBeNull()
    expect(hasLeaveRecordsKey()).toBe(false)
  })

  it('getLeaveRecords 当 localStorage 为合法 JSON 数组时正确解析', () => {
    const mockData: LeaveApplication[] = [
      {
        id: 'L001',
        studentName: '测试学生',
        className: '高三(1)班',
        courseName: '数学',
        leaveType: '病假',
        startDate: '2026-06-10',
        endDate: '2026-06-11',
        reason: '测试原因',
        status: 'pending',
        rejectReason: '',
        submittedAt: '2026-06-09 14:30',
        approvedAt: ''
      }
    ]
    localStorage.setItem(LEAVE_RECORDS_KEY, JSON.stringify(mockData))
    expect(hasLeaveRecordsKey()).toBe(true)
    expect(getLeaveRecords()).toEqual(mockData)
  })

  it('getLeaveRecords 当 localStorage 为非法 JSON 时返回空数组并写回 []', () => {
    localStorage.setItem(LEAVE_RECORDS_KEY, '{invalid json data!!!')
    expect(hasLeaveRecordsKey()).toBe(true)

    const result = getLeaveRecords()

    expect(result).toEqual([])
    expect(hasLeaveRecordsKey()).toBe(true)
    expect(localStorage.getItem(LEAVE_RECORDS_KEY)).toBe('[]')
  })

  it('getLeaveRecords 当 localStorage 为合法 JSON 但不是数组时返回空数组并写回 []', () => {
    const nonArrayCases = [
      { value: 'null', desc: 'null' },
      { value: '123', desc: 'number' },
      { value: '""', desc: 'empty string' },
      { value: '"hello"', desc: 'string' },
      { value: '{}', desc: 'object' },
      { value: '{"data": []}', desc: 'wrapped object' }
    ]

    for (const { value, desc } of nonArrayCases) {
      localStorage.clear()
      localStorage.setItem(LEAVE_RECORDS_KEY, value)
      expect(hasLeaveRecordsKey()).toBe(true)

      const result = getLeaveRecords()

      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual([])
      expect(hasLeaveRecordsKey()).toBe(true)
      expect(localStorage.getItem(LEAVE_RECORDS_KEY)).toBe('[]')
    }
  })

  it('getLeaveRecords 当 localStorage 为部分损坏的 JSON 语法时返回空数组并写回 []', () => {
    const corruptedCases = [
      '{',
      '}',
      '[',
      'not json at all',
      '{ "data": [ }',
      '[{"id": 1, "name": "test"}'
    ]

    for (const corrupted of corruptedCases) {
      localStorage.clear()
      localStorage.setItem(LEAVE_RECORDS_KEY, corrupted)
      expect(hasLeaveRecordsKey()).toBe(true)

      const result = getLeaveRecords()

      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual([])
      expect(hasLeaveRecordsKey()).toBe(true)
      expect(localStorage.getItem(LEAVE_RECORDS_KEY)).toBe('[]')
    }
  })

  it('saveLeaveRecords 正确保存数据', () => {
    const data: LeaveApplication[] = [
      {
        id: 'L002',
        studentName: '测试2',
        className: '高三(2)班',
        courseName: '语文',
        leaveType: '事假',
        startDate: '2026-06-12',
        endDate: '2026-06-12',
        reason: '测试',
        status: 'pending',
        rejectReason: '',
        submittedAt: '2026-06-11 09:00',
        approvedAt: ''
      }
    ]

    saveLeaveRecords(data)
    expect(JSON.parse(localStorage.getItem(LEAVE_RECORDS_KEY)!)).toEqual(data)
    expect(getLeaveRecords()).toEqual(data)
  })

  it('用户相关存储函数正常工作', () => {
    expect(getCurrentUsername()).toBeNull()

    setCurrentUsername('testuser')
    expect(getCurrentUsername()).toBe('testuser')
    expect(localStorage.getItem(CURRENT_USER_KEY)).toBe('testuser')

    removeCurrentUser()
    expect(getCurrentUsername()).toBeNull()
    expect(localStorage.getItem(CURRENT_USER_KEY)).toBeNull()
  })
})
