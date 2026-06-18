export type LeaveStatus = 'pending' | 'approved' | 'rejected'
export type LeaveType = '事假' | '病假' | '公假' | '丧假'

export interface LeaveApplication {
  id: string
  studentName: string
  className: string
  courseName: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  reason: string
  status: LeaveStatus
  rejectReason: string
  submittedAt: string
  approvedAt: string
}

export const CURRENT_USER_KEY = 'smart_campus_current_user'
export const LEAVE_RECORDS_KEY = 'smart_campus_leave_records'

export function getCurrentUsername(): string | null {
  return localStorage.getItem(CURRENT_USER_KEY)
}

export function setCurrentUsername(username: string): void {
  localStorage.setItem(CURRENT_USER_KEY, username)
}

export function removeCurrentUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export function hasLeaveRecordsKey(): boolean {
  return localStorage.getItem(LEAVE_RECORDS_KEY) !== null
}

function isLeaveApplicationArray(value: unknown): value is LeaveApplication[] {
  return Array.isArray(value)
}

export function getLeaveRecords(): LeaveApplication[] | null {
  const stored = localStorage.getItem(LEAVE_RECORDS_KEY)
  if (stored === null) {
    return null
  }
  try {
    const parsed = JSON.parse(stored)
    if (isLeaveApplicationArray(parsed)) {
      return parsed
    }
    saveLeaveRecords([])
    return []
  } catch {
    saveLeaveRecords([])
    return []
  }
}

export function saveLeaveRecords(applications: LeaveApplication[]): void {
  localStorage.setItem(LEAVE_RECORDS_KEY, JSON.stringify(applications))
}
