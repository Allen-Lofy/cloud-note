<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="card p-8 w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-slate-900">Cloud Note</h1>
        <p class="text-slate-600 mt-2">创建您的云笔记账户</p>
      </div>
      
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            用户名
          </label>
          <input
            v-model="form.username"
            type="text"
            required
            class="input"
            placeholder="输入用户名"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            邮箱
          </label>
          <input
            v-model="form.email"
            type="email"
            required
            class="input"
            placeholder="输入邮箱地址"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            密码
          </label>
          <input
            v-model="form.password"
            type="password"
            required
            class="input"
            placeholder="输入密码"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            确认密码
          </label>
          <input
            v-model="form.confirmPassword"
            type="password"
            required
            class="input"
            placeholder="再次输入密码"
          />
        </div>
        
        <div v-if="error" class="text-red-600 text-sm">
          {{ error }}
        </div>
        
        <button
          type="submit"
          :disabled="loading"
          class="w-full btn btn-primary"
        >
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>
      
      <div class="mt-6 text-center">
        <router-link 
          to="/login" 
          class="text-slate-600 hover:text-slate-900"
        >
          已有账户？立即登录
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'Register',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    
    const form = ref({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    })
    
    const error = ref('')
    const loading = ref(false)
    
    const handleRegister = async () => {
      error.value = ''
      
      if (form.value.password !== form.value.confirmPassword) {
        error.value = '密码确认不匹配'
        return
      }
      
      loading.value = true
      
      const result = await authStore.register({
        username: form.value.username,
        email: form.value.email,
        password: form.value.password
      })
      
      if (result.success) {
        router.push('/dashboard')
      } else {
        error.value = result.message
      }
      
      loading.value = false
    }
    
    return {
      form,
      error,
      loading,
      handleRegister
    }
  }
}
</script>