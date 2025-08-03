import { defineStore } from 'pinia'
import api from '@/utils/api'

export const useFilesStore = defineStore('files', {
  state: () => ({
    currentFolder: null,
    files: [],
    folders: [],
    loading: false,
    breadcrumbs: [],
    folderStack: []
  }),

  actions: {
    async loadFileTree(parentId = null) {
      this.loading = true
      try {
        const response = await api.get('/files/tree', {
          params: { parentId }
        })
        
        this.files = response.data.files
        this.folders = response.data.folders
        this.currentFolder = parentId
        
        // 更新文件夹栈用于导航
        if (parentId === null) {
          this.folderStack = []
        }
        
        return { success: true }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || '加载文件列表失败' 
        }
      } finally {
        this.loading = false
      }
    },

    async navigateToFolder(folderId, folderName = null) {
      if (folderId !== null && folderName) {
        this.folderStack.push({ id: folderId, name: folderName })
      }
      return await this.loadFileTree(folderId)
    },

    async navigateBack() {
      if (this.folderStack.length > 0) {
        this.folderStack.pop()
        const parentId = this.folderStack.length > 0 ? 
          this.folderStack[this.folderStack.length - 1].id : null
        return await this.loadFileTree(parentId)
      }
      return await this.loadFileTree(null)
    },

    async createFolder(name, parentId = null) {
      try {
        const response = await api.post('/files/folder', {
          name,
          parentId
        })
        
        this.folders.push(response.data)
        return { success: true, folder: response.data }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || '创建文件夹失败' 
        }
      }
    },

    async createFile(name, content = '', parentId = null) {
      try {
        const response = await api.post('/files/file', {
          name,
          content,
          parentId
        })
        
        this.files.push(response.data)
        return { success: true, file: response.data }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || '创建文件失败' 
        }
      }
    },

    async saveFile(fileId, content) {
      try {
        const response = await api.post('/files/file', {
          fileId,
          content
        })
        
        const fileIndex = this.files.findIndex(f => f.id === fileId)
        if (fileIndex !== -1) {
          this.files[fileIndex] = response.data
        }
        
        return { success: true, file: response.data }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || '保存文件失败' 
        }
      }
    },

    async getFile(fileId) {
      try {
        const response = await api.get(`/files/file/${fileId}`)
        return { success: true, file: response.data }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || '获取文件失败' 
        }
      }
    },

    async deleteFile(fileId) {
      try {
        await api.delete(`/files/file/${fileId}`)
        this.files = this.files.filter(f => f.id !== fileId)
        return { success: true }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || '删除文件失败' 
        }
      }
    },

    async deleteFolder(folderId) {
      try {
        await api.delete(`/files/folder/${folderId}`)
        this.folders = this.folders.filter(f => f.id !== folderId)
        return { success: true }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || '删除文件夹失败' 
        }
      }
    },

    async uploadFile(file, parentId = null) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        if (parentId) {
          formData.append('parentId', parentId)
        }
        
        const response = await api.post('/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        this.files.push(response.data)
        return { success: true, file: response.data }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || '上传文件失败' 
        }
      }
    },

    async downloadFile(fileId, fileName) {
      try {
        const response = await api.get(`/files/download/${fileId}`, {
          responseType: 'blob'
        })
        
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        
        return { success: true }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || '下载文件失败' 
        }
      }
    },

    async renameFile(fileId, newName) {
      try {
        const response = await api.put(`/files/file/${fileId}/rename`, {
          name: newName
        })
        
        const fileIndex = this.files.findIndex(f => f.id === fileId)
        if (fileIndex !== -1) {
          this.files[fileIndex] = response.data
        }
        
        return { success: true, file: response.data }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || '重命名文件失败' 
        }
      }
    },

    async renameFolder(folderId, newName) {
      try {
        const response = await api.put(`/files/folder/${folderId}/rename`, {
          name: newName
        })
        
        const folderIndex = this.folders.findIndex(f => f.id === folderId)
        if (folderIndex !== -1) {
          this.folders[folderIndex] = response.data
        }
        
        return { success: true, folder: response.data }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || '重命名文件夹失败' 
        }
      }
    },

    async moveFile(fileId, newParentId) {
      try {
        const response = await api.put(`/files/file/${fileId}/move`, {
          parentId: newParentId
        })
        
        // 从当前列表中移除文件
        this.files = this.files.filter(f => f.id !== fileId)
        
        return { success: true, file: response.data }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || '移动文件失败' 
        }
      }
    },

    async moveFolder(folderId, newParentId) {
      try {
        const response = await api.put(`/files/folder/${folderId}/move`, {
          parentId: newParentId
        })
        
        // 从当前列表中移除文件夹
        this.folders = this.folders.filter(f => f.id !== folderId)
        
        return { success: true, folder: response.data }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || '移动文件夹失败' 
        }
      }
    }
  }
})