import {
  getLeaveRecords,
  saveLeaveRecords,
  LEAVE_RECORDS_KEY,
  type LeaveApplication,
  type LeaveStatus,
  type LeaveType
} from '../utils/leaveStorage'

export { LEAVE_RECORDS_KEY as STORAGE_KEY }
export type { LeaveApplication, LeaveStatus, LeaveType }

const RAW_APPLICATIONS: Omit<LeaveApplication, 'status' | 'rejectReason' | 'approvedAt'>[] = [
  {
    id: 'L001',
    studentName: '张伟',
    className: '高三(1)班',
    courseName: '数学',
    leaveType: '病假',
    startDate: '2026-06-10',
    endDate: '2026-06-11',
    reason: '发烧38.5度，需要在家休息',
    submittedAt: '2026-06-09 14:30'
  },
  {
    id: 'L002',
    studentName: '李娜',
    className: '高三(2)班',
    courseName: '语文',
    leaveType: '事假',
    startDate: '2026-06-12',
    endDate: '2026-06-12',
    reason: '家中临时有事需要处理',
    submittedAt: '2026-06-11 09:15'
  },
  {
    id: 'L003',
    studentName: '王磊',
    className: '高三(1)班',
    courseName: '英语',
    leaveType: '公假',
    startDate: '2026-06-14',
    endDate: '2026-06-14',
    reason: '参加市级英语演讲比赛',
    submittedAt: '2026-06-12 16:00'
  },
  {
    id: 'L004',
    studentName: '赵敏',
    className: '高三(3)班',
    courseName: '物理',
    leaveType: '病假',
    startDate: '2026-06-15',
    endDate: '2026-06-16',
    reason: '肠胃不适需就医检查',
    submittedAt: '2026-06-14 20:45'
  },
  {
    id: 'L005',
    studentName: '陈浩',
    className: '高三(2)班',
    courseName: '化学',
    leaveType: '事假',
    startDate: '2026-06-16',
    endDate: '2026-06-17',
    reason: '需回老家办理身份证',
    submittedAt: '2026-06-15 08:30'
  },
  {
    id: 'L006',
    studentName: '刘洋',
    className: '高三(1)班',
    courseName: '数学',
    leaveType: '丧假',
    startDate: '2026-06-13',
    endDate: '2026-06-15',
    reason: '家中老人去世需要处理后事',
    submittedAt: '2026-06-12 22:10'
  },
  {
    id: 'L007',
    studentName: '孙婷',
    className: '高三(3)班',
    courseName: '语文',
    leaveType: '病假',
    startDate: '2026-06-11',
    endDate: '2026-06-12',
    reason: '感冒发烧需卧床休息',
    submittedAt: '2026-06-10 18:00'
  },
  {
    id: 'L008',
    studentName: '周杰',
    className: '高三(2)班',
    courseName: '英语',
    leaveType: '公假',
    startDate: '2026-06-16',
    endDate: '2026-06-16',
    reason: '代表学校参加区级运动会',
    submittedAt: '2026-06-15 10:20'
  },
  {
    id: 'L009',
    studentName: '吴芳',
    className: '高三(1)班',
    courseName: '物理',
    leaveType: '事假',
    startDate: '2026-06-17',
    endDate: '2026-06-18',
    reason: '家中房屋修缮需协助',
    submittedAt: '2026-06-16 07:00'
  },
  {
    id: 'L010',
    studentName: '郑宇',
    className: '高三(3)班',
    courseName: '化学',
    leaveType: '病假',
    startDate: '2026-06-14',
    endDate: '2026-06-14',
    reason: '牙痛需就医拔牙',
    submittedAt: '2026-06-13 21:30'
  }
]

export function getInitialApplications(): LeaveApplication[] {
  const stored = getLeaveRecords()
  if (stored !== null) {
    return stored
  }
  const applications: LeaveApplication[] = RAW_APPLICATIONS.map((item) => ({
    ...item,
    status: 'pending' as LeaveStatus,
    rejectReason: '',
    approvedAt: ''
  }))
  saveLeaveRecords(applications)
  return applications
}

export function saveApplications(applications: LeaveApplication[]): void {
  saveLeaveRecords(applications)
}

export function addApplication(app: Omit<LeaveApplication, 'id' | 'status' | 'rejectReason' | 'approvedAt'>): LeaveApplication {
  const applications = getInitialApplications()
  const maxNum = applications.reduce((max, a) => {
    const num = parseInt(a.id.replace('L', ''), 10)
    return num > max ? num : max
  }, 0)
  const newApp: LeaveApplication = {
    ...app,
    id: `L${String(maxNum + 1).padStart(3, '0')}`,
    status: 'pending',
    rejectReason: '',
    approvedAt: ''
  }
  applications.push(newApp)
  saveApplications(applications)
  return newApp
}
