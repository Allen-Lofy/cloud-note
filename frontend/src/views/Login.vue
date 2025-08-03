<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="card p-8 w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-slate-900">Cloud Note</h1>
        <p class="text-slate-600 mt-2">登录到您的云笔记</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            用户名或邮箱
          </label>
          <input
            v-model="form.username"
            type="text"
            required
            class="input"
            placeholder="输入用户名或邮箱"
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
        
        <div v-if="error" class="text-red-600 text-sm">
          {{ error }}
        </div>
        
        <button
          type="submit"
          :disabled="loading"
          class="w-full btn btn-primary"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
      
      <div class="mt-6 text-center">
        <router-link 
          to="/register" 
          class="text-slate-600 hover:text-slate-900"
        >
          还没有账户？立即注册
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
  name: 'Login',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    
    const form = ref({
      username: '',
      password: ''
    })
    
    const error = ref('')
    const loading = ref(false)
    
    const handleLogin = async () => {
      error.value = ''
      loading.value = true
      
      const result = await authStore.login(form.value)
      
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
      handleLogin
    }
  }
}
</script>