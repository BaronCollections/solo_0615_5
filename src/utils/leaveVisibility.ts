import type { LeaveApplication, LeaveStatus } from './leaveStorage'

export function canWithdraw(status: LeaveStatus): boolean {
  return status === 'pending'
}

export function isPendingForTeacher(status: LeaveStatus): boolean {
  return status === 'pending'
}

export function filterPendingForTeacher(applications: LeaveApplication[]): LeaveApplication[] {
  return applications.filter((a) => isPendingForTeacher(a.status))
}

export function statusTagType(status: LeaveStatus): '' | 'success' | 'danger' | 'warning' | 'info' {
  const map: Record<LeaveStatus, '' | 'success' | 'danger' | 'warning' | 'info'> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    withdrawn: 'info'
  }
  return map[status]
}

export function statusLabel(status: LeaveStatus): string {
  const map: Record<LeaveStatus, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    withdrawn: '已撤回'
  }
  return map[status]
}
