<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { SwitchButton, View } from '@element-plus/icons-vue'
import {
  getInitialApplications,
  addApplication,
  withdrawApplication,
  type LeaveApplication,
  type LeaveType,
  type LeaveStatus
} from '../mock/leaves'
import {
  getCurrentUsername,
  removeCurrentUser,
  LEAVE_RECORDS_KEY
} from '../utils/leaveStorage'
import { mockUsers } from '../mock/accounts'

const router = useRouter()

const currentUser = computed(() => {
  const username = getCurrentUsername()
  if (!username) return null
  return mockUsers.find((u) => u.username === username) || null
})

const myApplications = ref<LeaveApplication[]>([])
const detailVisible = ref(false)
const currentApplication = ref<LeaveApplication | null>(null)

const formRef = ref<FormInstance>()
const submitting = ref(false)

const leaveForm = ref({
  leaveType: '' as LeaveType | '',
  courseName: '',
  startDate: '',
  endDate: '',
  reason: ''
})

const leaveTypeOptions: LeaveType[] = ['事假', '病假', '公假', '丧假']
const courseOptions = ['数学', '语文', '英语', '物理', '化学']

const leaveRules: FormRules = {
  leaveType: [{ required: true, message: '请选择请假类型', trigger: 'change' }],
  courseName: [{ required: true, message: '请选择课程', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  reason: [{ required: true, message: '请填写请假原因', trigger: 'blur' }]
}

const statusTagType = (status: LeaveStatus) => {
  const map: Record<LeaveStatus, '' | 'success' | 'danger' | 'warning' | 'info'> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    withdrawn: 'info'
  }
  return map[status]
}

const statusLabel = (status: LeaveStatus) => {
  const map: Record<LeaveStatus, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    withdrawn: '已撤回'
  }
  return map[status]
}

const loadMyApplications = () => {
  const all = getInitialApplications()
  const name = currentUser.value?.name || ''
  myApplications.value = all
    .filter((a) => a.studentName === name)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

const handleStorageChange = (e: StorageEvent) => {
  if (e.key === LEAVE_RECORDS_KEY) {
    loadMyApplications()
  }
}

onMounted(() => {
  if (!currentUser.value || currentUser.value.role !== 'student') {
    router.replace('/login')
    return
  }
  loadMyApplications()
  window.addEventListener('storage', handleStorageChange)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
})

const handleSubmit = async () => {
  if (!formRef.value || !currentUser.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    if (leaveForm.value.endDate < leaveForm.value.startDate) {
      ElMessage.error('结束日期不能早于开始日期')
      return
    }
    submitting.value = true
    setTimeout(() => {
      addApplication({
        studentName: currentUser.value!.name,
        className: currentUser.value!.className || '',
        courseName: leaveForm.value.courseName,
        leaveType: leaveForm.value.leaveType as LeaveType,
        startDate: leaveForm.value.startDate,
        endDate: leaveForm.value.endDate,
        reason: leaveForm.value.reason,
        submittedAt: new Date().toLocaleString('zh-CN')
      })
      ElMessage.success('请假申请已提交，等待教师审批')
      leaveForm.value = {
        leaveType: '',
        courseName: '',
        startDate: '',
        endDate: '',
        reason: ''
      }
      formRef.value?.resetFields()
      loadMyApplications()
      submitting.value = false
    }, 300)
  })
}

const handleReset = () => {
  leaveForm.value = {
    leaveType: '',
    courseName: '',
    startDate: '',
    endDate: '',
    reason: ''
  }
  formRef.value?.resetFields()
}

const handleViewDetail = (row: LeaveApplication) => {
  currentApplication.value = row
  detailVisible.value = true
}

const handleWithdraw = async (row: LeaveApplication) => {
  try {
    await ElMessageBox.confirm('确认撤回该请假申请？撤回后将无法恢复。', '撤回确认', {
      confirmButtonText: '确认撤回',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const success = withdrawApplication(row.id)
    if (success) {
      ElMessage.success('申请已撤回')
      loadMyApplications()
    } else {
      ElMessage.error('撤回失败，该申请状态可能已变更')
    }
  } catch {
    // cancelled
  }
}

const handleLogout = () => {
  removeCurrentUser()
  router.replace('/login')
}
</script>

<template>
  <div class="student-page">
    <el-container>
      <el-header class="page-header">
        <div class="header-left">
          <h1 class="page-title">学生请假申请</h1>
          <span class="student-info">{{ currentUser?.name }} · {{ currentUser?.className }}</span>
        </div>
        <el-button :icon="SwitchButton" @click="handleLogout">退出登录</el-button>
      </el-header>

      <el-main class="page-main">
        <el-card class="form-card" shadow="never">
          <template #header>
            <span class="card-title">提交请假申请</span>
          </template>
          <el-form
            ref="formRef"
            :model="leaveForm"
            :rules="leaveRules"
            label-width="100px"
            style="max-width: 560px"
          >
            <el-form-item label="请假类型" prop="leaveType">
              <el-select v-model="leaveForm.leaveType" placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="t in leaveTypeOptions"
                  :key="t"
                  :label="t"
                  :value="t"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="课程" prop="courseName">
              <el-select v-model="leaveForm.courseName" placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="c in courseOptions"
                  :key="c"
                  :label="c"
                  :value="c"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="开始日期" prop="startDate">
              <el-date-picker
                v-model="leaveForm.startDate"
                type="date"
                placeholder="选择开始日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="结束日期" prop="endDate">
              <el-date-picker
                v-model="leaveForm.endDate"
                type="date"
                placeholder="选择结束日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="请假原因" prop="reason">
              <el-input
                v-model="leaveForm.reason"
                type="textarea"
                :rows="3"
                placeholder="请详细说明请假原因"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="submitting" @click="handleSubmit">
                提交申请
              </el-button>
              <el-button @click="handleReset">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="records-card" shadow="never">
          <template #header>
            <span class="card-title">我的请假记录</span>
          </template>
          <el-table :data="myApplications" stripe border style="width: 100%">
            <el-table-column prop="id" label="申请编号" width="100" />
            <el-table-column prop="courseName" label="课程" width="90" />
            <el-table-column prop="leaveType" label="请假类型" width="90" />
            <el-table-column label="请假时间" width="200">
              <template #default="{ row }">
                {{ row.startDate }} 至 {{ row.endDate }}
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="请假原因" min-width="160" show-overflow-tooltip />
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)" size="small">
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="驳回原因" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="row.status === 'rejected' && row.rejectReason" style="color: #f56c6c">
                  {{ row.rejectReason }}
                </span>
                <span v-else style="color: #c0c4cc">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="submittedAt" label="提交时间" width="160" />
            <el-table-column label="审批时间" width="160">
              <template #default="{ row }">
                <span v-if="row.approvedAt">{{ row.approvedAt }}</span>
                <span v-else style="color: #c0c4cc">-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right" align="center">
              <template #default="{ row }">
                <el-button link type="primary" :icon="View" @click="handleViewDetail(row)">
                  详情
                </el-button>
                <el-button
                  v-if="row.status === 'pending'"
                  link
                  type="danger"
                  @click="handleWithdraw(row)"
                >
                  撤回
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="myApplications.length === 0" description="暂无请假记录" />
        </el-card>
      </el-main>
    </el-container>

    <el-dialog v-model="detailVisible" title="请假详情" width="520px" destroy-on-close>
      <template v-if="currentApplication">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请编号">{{ currentApplication.id }}</el-descriptions-item>
          <el-descriptions-item label="学生姓名">{{ currentApplication.studentName }}</el-descriptions-item>
          <el-descriptions-item label="班级">{{ currentApplication.className }}</el-descriptions-item>
          <el-descriptions-item label="课程">{{ currentApplication.courseName }}</el-descriptions-item>
          <el-descriptions-item label="请假类型">{{ currentApplication.leaveType }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="statusTagType(currentApplication.status)" size="small">
              {{ statusLabel(currentApplication.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开始日期">{{ currentApplication.startDate }}</el-descriptions-item>
          <el-descriptions-item label="结束日期">{{ currentApplication.endDate }}</el-descriptions-item>
          <el-descriptions-item label="请假原因" :span="2">{{ currentApplication.reason }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ currentApplication.submittedAt }}</el-descriptions-item>
          <el-descriptions-item v-if="currentApplication.approvedAt" label="审批时间">
            {{ currentApplication.approvedAt }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="currentApplication.status === 'rejected' && currentApplication.rejectReason"
            label="驳回原因"
            :span="2"
          >
            <span style="color: #f56c6c">{{ currentApplication.rejectReason }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.student-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 0 24px;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.student-info {
  font-size: 14px;
  color: #909399;
}

.page-main {
  padding: 20px;
}

.form-card {
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
}

.records-card :deep(.el-card__body) {
  padding-top: 0;
}

.el-table {
  margin-top: 12px;
}
</style>
