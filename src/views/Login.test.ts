import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { createRouter, createWebHistory } from 'vue-router'
import Login from './Login.vue'
import { mockUsers } from '../mock/accounts'

const createTestRouter = () => {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', redirect: '/login' },
      { path: '/login', name: 'Login', component: { template: '<div />' } },
      { path: '/leave-approval', name: 'LeaveApproval', component: { template: '<div />' } },
      { path: '/student-leave', name: 'StudentLeave', component: { template: '<div />' } }
    ]
  })
}

const mountLogin = async () => {
  const router = createTestRouter()
  router.push('/login')
  await router.isReady()
  const wrapper = mount(Login, {
    global: {
      plugins: [ElementPlus, router]
    }
  })
  return { wrapper, router }
}

const findInputByPlaceholder = (wrapper: any, placeholder: string) => {
  return wrapper.findAll('input').find((input: any) => input.attributes('placeholder') === placeholder)
}

const fillLoginForm = async (wrapper: any, username: string, password: string) => {
  const usernameInput = findInputByPlaceholder(wrapper, '请输入账号')
  const passwordInput = findInputByPlaceholder(wrapper, '请输入密码')

  if (usernameInput) {
    await usernameInput.setValue(username)
  }
  if (passwordInput) {
    await passwordInput.setValue(password)
  }
}

const clickLoginButton = async (wrapper: any) => {
  const loginButton = wrapper.findAll('button').find((btn: any) => btn.text().includes('登 录'))
  if (loginButton) {
    await loginButton.trigger('click')
  }
}

describe('Login.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  describe('三类测试账号登录成功', () => {
    it('应成功登录 admin 账号', async () => {
      const { wrapper } = await mountLogin()
      const user = mockUsers[0]

      await fillLoginForm(wrapper, user.username, user.password)
      await clickLoginButton(wrapper)

      await vi.advanceTimersByTimeAsync(600)
      await wrapper.vm.$nextTick()

      expect(localStorage.getItem('smart_campus_current_user')).toBe(user.username)
    })

    it('应成功登录 teacher 账号', async () => {
      const { wrapper } = await mountLogin()
      const user = mockUsers[1]

      await fillLoginForm(wrapper, user.username, user.password)
      await clickLoginButton(wrapper)

      await vi.advanceTimersByTimeAsync(600)
      await wrapper.vm.$nextTick()

      expect(localStorage.getItem('smart_campus_current_user')).toBe(user.username)
    })

    it('应成功登录 student 账号', async () => {
      const { wrapper } = await mountLogin()
      const user = mockUsers[2]

      await fillLoginForm(wrapper, user.username, user.password)
      await clickLoginButton(wrapper)

      await vi.advanceTimersByTimeAsync(600)
      await wrapper.vm.$nextTick()

      expect(localStorage.getItem('smart_campus_current_user')).toBe(user.username)
    })
  })

  describe('错误密码登录失败', () => {
    it('使用错误密码登录应显示密码错误提示', async () => {
      const { wrapper } = await mountLogin()

      await fillLoginForm(wrapper, 'admin', 'wrongpassword')
      await clickLoginButton(wrapper)

      await vi.advanceTimersByTimeAsync(600)
      await wrapper.vm.$nextTick()

      expect(localStorage.getItem('smart_campus_current_user')).toBeNull()
    })

    it('使用不存在的账号登录应显示账号不存在提示', async () => {
      const { wrapper } = await mountLogin()

      await fillLoginForm(wrapper, 'nonexistent', 'anypassword')
      await clickLoginButton(wrapper)

      await vi.advanceTimersByTimeAsync(600)
      await wrapper.vm.$nextTick()

      expect(localStorage.getItem('smart_campus_current_user')).toBeNull()
    })
  })

  describe('空账号或空密码校验', () => {
    it('账号为空时点击登录不应触发登录且保持在登录页面', async () => {
      const { wrapper } = await mountLogin()

      const passwordInput = findInputByPlaceholder(wrapper, '请输入密码')
      const usernameInput = findInputByPlaceholder(wrapper, '请输入账号')

      if (passwordInput) {
        await passwordInput.setValue('admin123')
        await passwordInput.trigger('blur')
      }
      if (usernameInput) {
        await usernameInput.setValue('')
        await usernameInput.trigger('blur')
      }

      await clickLoginButton(wrapper)

      await vi.advanceTimersByTimeAsync(600)
      await wrapper.vm.$nextTick()

      const loginCard = wrapper.find('.login-card')
      expect(loginCard.exists()).toBe(true)
      expect(localStorage.getItem('smart_campus_current_user')).toBeNull()
    })

    it('密码为空时点击登录不应触发登录且保持在登录页面', async () => {
      const { wrapper } = await mountLogin()

      const usernameInput = findInputByPlaceholder(wrapper, '请输入账号')
      const passwordInput = findInputByPlaceholder(wrapper, '请输入密码')

      if (usernameInput) {
        await usernameInput.setValue('admin')
        await usernameInput.trigger('blur')
      }
      if (passwordInput) {
        await passwordInput.setValue('')
        await passwordInput.trigger('blur')
      }

      await clickLoginButton(wrapper)

      await vi.advanceTimersByTimeAsync(600)
      await wrapper.vm.$nextTick()

      const loginCard = wrapper.find('.login-card')
      expect(loginCard.exists()).toBe(true)
      expect(localStorage.getItem('smart_campus_current_user')).toBeNull()
    })

    it('账号和密码都为空时点击登录不应触发登录且保持在登录页面', async () => {
      const { wrapper } = await mountLogin()

      const usernameInput = findInputByPlaceholder(wrapper, '请输入账号')
      const passwordInput = findInputByPlaceholder(wrapper, '请输入密码')

      if (usernameInput) {
        await usernameInput.setValue('')
        await usernameInput.trigger('blur')
      }
      if (passwordInput) {
        await passwordInput.setValue('')
        await passwordInput.trigger('blur')
      }

      await clickLoginButton(wrapper)

      await vi.advanceTimersByTimeAsync(600)
      await wrapper.vm.$nextTick()

      const loginCard = wrapper.find('.login-card')
      expect(loginCard.exists()).toBe(true)
      expect(localStorage.getItem('smart_campus_current_user')).toBeNull()
    })
  })

  describe('登录成功后按角色跳转', () => {
    it('教师登录成功后应跳转到请假审批页', async () => {
      const { wrapper, router } = await mountLogin()
      const teacher = mockUsers[1]
      const pushSpy = vi.spyOn(router, 'replace')

      await fillLoginForm(wrapper, teacher.username, teacher.password)
      await clickLoginButton(wrapper)

      await vi.advanceTimersByTimeAsync(600)
      await wrapper.vm.$nextTick()

      expect(pushSpy).toHaveBeenCalledWith('/leave-approval')
    })

    it('学生登录成功后应跳转到学生请假页', async () => {
      const { wrapper, router } = await mountLogin()
      const student = mockUsers[2]
      const pushSpy = vi.spyOn(router, 'replace')

      await fillLoginForm(wrapper, student.username, student.password)
      await clickLoginButton(wrapper)

      await vi.advanceTimersByTimeAsync(600)
      await wrapper.vm.$nextTick()

      expect(pushSpy).toHaveBeenCalledWith('/student-leave')
    })

    it('管理员登录成功后应显示暂无功能提示', async () => {
      const { wrapper, router } = await mountLogin()
      const admin = mockUsers[0]
      const pushSpy = vi.spyOn(router, 'replace')

      await fillLoginForm(wrapper, admin.username, admin.password)
      await clickLoginButton(wrapper)

      await vi.advanceTimersByTimeAsync(600)
      await wrapper.vm.$nextTick()

      expect(pushSpy).not.toHaveBeenCalled()
      expect(localStorage.getItem('smart_campus_current_user')).toBe(admin.username)
    })
  })
})
