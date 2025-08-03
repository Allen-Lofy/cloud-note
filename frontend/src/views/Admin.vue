<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-4">
            <button
              @click="$router.push('/dashboard')"
              class="p-2 hover:bg-gray-100 rounded"
            >
              <ArrowLeft class="w-5 h-5" />
            </button>
            <h1 class="text-xl font-semibold text-gray-900">管理面板</h1>
          </div>
          
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-600">
              管理员: {{ authStore.user?.username }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="card p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <Users class="w-8 h-8 text-blue-500" />
            </div>
            <div class="ml-4">
              <div class="text-2xl font-bold text-gray-900">{{ stats.totalUsers }}</div>
              <div class="text-sm text-gray-600">总用户数</div>
            </div>
          </div>
        </div>
        
        <div class="card p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <FileText class="w-8 h-8 text-green-500" />
            </div>
            <div class="ml-4">
              <div class="text-2xl font-bold text-gray-900">{{ stats.totalFiles }}</div>
              <div class="text-sm text-gray-600">总文件数</div>
            </div>
          </div>
        </div>
        
        <div class="card p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <Folder class="w-8 h-8 text-yellow-500" />
            </div>
            <div class="ml-4">
              <div class="text-2xl font-bold text-gray-900">{{ stats.totalFolders }}</div>
              <div class="text-sm text-gray-600">总文件夹数</div>
            </div>
          </div>
        </div>
        
        <div class="card p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <Shield class="w-8 h-8 text-purple-500" />
            </div>
            <div class="ml-4">
              <div class="text-2xl font-bold text-gray-900">{{ stats.adminUsers }}</div>
              <div class="text-sm text-gray-600">管理员数</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Database Backup -->
      <div class="card mb-8">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">数据库备份</h2>
        </div>
        <div class="p-6">
          <div class="flex flex-col sm:flex-row gap-4">
            <div class="flex-1">
              <p class="text-sm text-gray-600 mb-4">
                定期备份数据库以确保数据安全。支持 SQL 和 JSON 两种格式的备份。
              </p>
            </div>
            <div class="flex gap-3">
              <button
                @click="downloadBackup('sql')"
                :disabled="isBackupLoading"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Download class="w-4 h-4" />
                <span>{{ isBackupLoading ? '导出中...' : 'SQL 备份' }}</span>
              </button>
              <button
                @click="downloadBackup('json')"
                :disabled="isBackupLoading"
                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Download class="w-4 h-4" />
                <span>{{ isBackupLoading ? '导出中...' : 'JSON 备份' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Users Table -->
      <div class="card">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">用户管理</h2>
        </div>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  邮箱
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  注册时间
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="user in users" :key="user.id">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ user.username }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ user.email }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="{
                      'bg-purple-100 text-purple-800': user.role === 'admin',
                      'bg-gray-100 text-gray-800': user.role === 'user'
                    }"
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                  >
                    {{ user.role === 'admin' ? '管理员' : '用户' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ formatDate(user.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    v-if="user.id !== authStore.user?.id"
                    @click="deleteUser(user)"
                    class="text-red-600 hover:text-red-900"
                  >
                    删除
                  </button>
                  <span v-else class="text-gray-400">当前用户</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'
import { 
  ArrowLeft, 
  Users, 
  FileText, 
  Folder, 
  Shield,
  Download
} from 'lucide-vue-next'

export default {
  name: 'Admin',
  components: {
    ArrowLeft,
    Users,
    FileText,
    Folder,
    Shield,
    Download
  },
  setup() {
    const authStore = useAuthStore()
    const users = ref([])
    const stats = ref({
      totalUsers: 0,
      totalFiles: 0,
      totalFolders: 0,
      adminUsers: 0,
      regularUsers: 0
    })
    
    const isBackupLoading = ref(false)
    
    const loadUsers = async () => {
      try {
        const response = await api.get('/admin/users')
        users.value = response.data
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }
    
    const loadStats = async () => {
      try {
        const response = await api.get('/admin/stats')
        stats.value = response.data
      } catch (error) {
        console.error('Failed to load stats:', error)
      }
    }
    
    const deleteUser = async (user) => {
      if (!confirm(`确定要删除用户 "${user.username}" 吗？这将同时删除该用户的所有文件和文件夹。`)) {
        return
      }
      
      try {
        await api.delete(`/admin/users/${user.id}`)
        await loadUsers()
        await loadStats()
      } catch (error) {
        console.error('Failed to delete user:', error)
        alert('删除用户失败')
      }
    }
    
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    const downloadBackup = async (format) => {
      if (isBackupLoading.value) return
      
      try {
        isBackupLoading.value = true
        
        const endpoint = format === 'sql' ? '/admin/backup' : '/admin/backup-json'
        const response = await api.get(endpoint, {
          responseType: 'blob'
        })
        
        // 创建下载链接
        const blob = new Blob([response.data])
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        
        // 从响应头获取文件名，或使用默认名称
        const contentDisposition = response.headers['content-disposition']
        let filename = `cloudnote_backup_${new Date().toISOString().slice(0, 10)}.${format === 'sql' ? 'sql' : 'json'}`
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '')
            filename = decodeURIComponent(filename)
          }
        }
        
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
      } catch (error) {
        console.error('备份下载失败:', error)
        alert('备份下载失败，请稍后重试')
      } finally {
        isBackupLoading.value = false
      }
    }
    
    onMounted(async () => {
      await Promise.all([
        loadUsers(),
        loadStats()
      ])
    })
    
    return {
      authStore,
      users,
      stats,
      isBackupLoading,
      deleteUser,
      downloadBackup,
      formatDate
    }
  }
}
</script>