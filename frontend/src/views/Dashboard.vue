<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold text-gray-900">Cloud Note</h1>
          </div>
          
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-600">
              欢迎, {{ authStore.user?.username }}
            </span>
            <button
              v-if="authStore.isAdmin"
              @click="$router.push('/admin')"
              class="btn btn-secondary text-sm"
            >
              管理面板
            </button>
            <button
              @click="showUserSettings = true"
              class="btn btn-secondary text-sm"
            >
              设置
            </button>
            <button
              @click="logout"
              class="btn btn-primary text-sm"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Sidebar -->
        <div class="lg:col-span-1">
          <div class="card p-4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-medium text-gray-900">文件管理</h2>
              <div class="flex space-x-2">
                <button
                  @click="showNewFolderModal = true"
                  class="p-1 hover:bg-gray-100 rounded"
                  title="新建文件夹"
                >
                  <FolderPlus class="w-4 h-4" />
                </button>
                <button
                  @click="showNewFileModal = true"
                  class="p-1 hover:bg-gray-100 rounded"
                  title="新建文件"
                >
                  <FilePlus class="w-4 h-4" />
                </button>
                <label class="p-1 hover:bg-gray-100 rounded cursor-pointer flex items-center justify-center" title="上传文件">
                  <Upload class="w-4 h-4" />
                  <input
                    type="file"
                    @change="handleFileUpload"
                    class="hidden"
                    multiple
                  />
                </label>
                <button
                  @click="downloadSelectedFiles"
                  :disabled="selectedFiles.length === 0"
                  class="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title="下载选定文件"
                >
                  <Download class="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <!-- Breadcrumb Navigation -->
            <div v-if="filesStore.folderStack.length > 0" class="mb-4">
              <div class="bg-gray-50 rounded-lg px-3 py-2 border overflow-hidden">
                <div class="flex items-center text-sm min-w-0">
                  <button
                    @click="goHome"
                    class="hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors font-medium text-gray-700 flex-shrink-0"
                    :class="{ 'bg-blue-100 border border-blue-300': dragOver === 'root' }"
                    data-drop-zone="null"
                    @dragover.prevent="onDragOverBreadcrumb($event, null)"
                    @dragleave="onDragLeaveBreadcrumb"
                    @drop.stop="onDropOnBreadcrumb($event, null)"
                  >
                    根目录
                  </button>
                  
                  <!-- Show ellipsis if path is too long -->
                  <template v-if="filesStore.folderStack.length > 3">
                    <span class="mx-2 text-gray-400 select-none flex-shrink-0">/</span>
                    <span class="text-gray-400 px-2 py-1 flex-shrink-0">...</span>
                    <span class="mx-2 text-gray-400 select-none flex-shrink-0">/</span>
                    <!-- Show only the last 2 levels -->
                    <template v-for="(folder, index) in filesStore.folderStack.slice(-2)" :key="folder.id">
                      <button
                        v-if="index < 1"
                        @click="navigateToLevel(filesStore.folderStack.length - 2 + index)"
                        class="hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors font-medium text-gray-700 truncate max-w-32"
                        :class="{ 'bg-blue-100 border border-blue-300': dragOver === `breadcrumb-${folder.id}` }"
                        :data-drop-zone="folder.id"
                        @dragover.prevent="onDragOverBreadcrumb($event, folder.id)"
                        @dragleave="onDragLeaveBreadcrumb"
                        @drop.stop="onDropOnBreadcrumb($event, folder.id)"
                        :title="folder.name"
                      >
                        {{ folder.name }}
                      </button>
                      <span v-else class="text-blue-600 font-semibold px-2 py-1 bg-blue-100 rounded truncate max-w-32" :title="folder.name">
                        {{ folder.name }}
                      </span>
                      <span v-if="index < 1" class="mx-2 text-gray-400 select-none flex-shrink-0">/</span>
                    </template>
                  </template>
                  
                  <!-- Show full path if not too long -->
                  <template v-else>
                    <span v-for="(folder, index) in filesStore.folderStack" :key="folder.id" class="flex items-center min-w-0">
                      <span class="mx-2 text-gray-400 select-none flex-shrink-0">/</span>
                      <button
                        v-if="index < filesStore.folderStack.length - 1"
                        @click="navigateToLevel(index)"
                        class="hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors font-medium text-gray-700 truncate max-w-32"
                        :class="{ 'bg-blue-100 border border-blue-300': dragOver === `breadcrumb-${folder.id}` }"
                        :data-drop-zone="folder.id"
                        @dragover.prevent="onDragOverBreadcrumb($event, folder.id)"
                        @dragleave="onDragLeaveBreadcrumb"
                        @drop.stop="onDropOnBreadcrumb($event, folder.id)"
                        :title="folder.name"
                      >
                        {{ folder.name }}
                      </button>
                      <span v-else class="text-blue-600 font-semibold px-2 py-1 bg-blue-100 rounded truncate max-w-32" :title="folder.name">
                        {{ folder.name }}
                      </span>
                    </span>
                  </template>
                </div>
              </div>
            </div>
            
            <!-- File Tree -->
            <div 
              class="space-y-1 min-h-20"
              data-drop-zone="parent"
              @drop="onDropToParent"
              @dragover.prevent
              @dragenter.prevent
            >
              <div
                v-for="folder in filesStore.folders"
                :key="'folder-' + folder.id"
                class="group flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer select-none"
                :class="{ 'bg-blue-50 border-2 border-blue-200': dragOver === folder.id }"
                :data-drop-zone="folder.id"
                draggable="true"
                @click="openFolder(folder)"
                @contextmenu.prevent="showContextMenu($event, 'folder', folder)"
                @dragstart="onDragStart($event, 'folder', folder)"
                @dragend="onDragEnd"
                @dragover.prevent="onDragOver($event, folder.id)"
                @dragleave="onDragLeave"
                @drop.stop="onDropOnFolder($event, folder.id)"
                @touchstart="onTouchStart($event, 'folder', folder)"
                @touchmove="onTouchMove"
                @touchend="onTouchEnd"
              >
                <div class="flex items-center">
                  <Folder class="w-4 h-4 mr-2 text-blue-500" />
                  <span class="text-sm">{{ folder.name }}</span>
                </div>
                <div class="flex items-center space-x-1">
                  <button
                    @click.stop="showRenameModal('folder', folder)"
                    class="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-50 rounded"
                    title="重命名"
                  >
                    <Edit class="w-3 h-3 text-blue-500" />
                  </button>
                  <button
                    @click.stop="deleteItem('folder', folder.id)"
                    class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded"
                    title="删除"
                  >
                    <Trash2 class="w-3 h-3 text-red-500" />
                  </button>
                </div>
              </div>
              
              <div
                v-for="file in filesStore.files"
                :key="'file-' + file.id"
                class="group flex items-center justify-between p-2 hover:bg-gray-50 rounded select-none"
                :class="{ 'bg-blue-50': selectedFiles.includes(file.id) }"
                draggable="true"
                @contextmenu.prevent="showContextMenu($event, 'file', file)"
                @dragstart="onDragStart($event, 'file', file)"
                @dragend="onDragEnd"
                @touchstart="onTouchStart($event, 'file', file)"
                @touchmove="onTouchMove"
                @touchend="onTouchEnd"
              >
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    :checked="selectedFiles.includes(file.id)"
                    @change="toggleFileSelection(file.id)"
                    @click.stop
                    class="mr-2"
                  />
                  <FileText 
                    class="w-4 h-4 mr-2 text-gray-500 cursor-pointer" 
                    @click="openFile(file)"
                  />
                  <span 
                    class="text-sm cursor-pointer" 
                    @click="openFile(file)"
                  >{{ file.name }}</span>
                </div>
                <div class="flex items-center space-x-1">
                  <button
                    @click.stop="showRenameModal('file', file)"
                    class="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-50 rounded"
                    title="重命名"
                  >
                    <Edit class="w-3 h-3 text-blue-500" />
                  </button>
                  <button
                    @click.stop="downloadFile(file)"
                    class="opacity-0 group-hover:opacity-100 p-1 hover:bg-green-50 rounded"
                    title="下载"
                  >
                    <Download class="w-3 h-3 text-green-500" />
                  </button>
                  <button
                    @click.stop="deleteItem('file', file.id)"
                    class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded"
                    title="删除"
                  >
                    <Trash2 class="w-3 h-3 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="lg:col-span-3">
          <div class="card p-6">
            <div v-if="!selectedFile" class="text-center py-12">
              <FileText class="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 class="text-lg font-medium text-gray-900 mb-2">选择文件开始编辑</h3>
              <p class="text-gray-600">从左侧文件列表中选择一个文件，或创建新文件</p>
            </div>
            
            <div v-else>
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900">{{ selectedFile.name }}</h3>
                <div class="flex space-x-2">
                  <button
                    @click="togglePreview"
                    class="btn btn-secondary text-sm"
                    :class="{ 'btn-primary': showPreview && !sideBySideMode }"
                  >
                    {{ getCurrentModeText() }}
                  </button>
                  <button
                    @click="toggleSideBySide"
                    class="btn btn-secondary text-sm"
                    :class="{ 'btn-primary': sideBySideMode }"
                  >
                    并排模式
                  </button>
                  <button
                    v-if="showPreview"
                    @click="exportToPDF"
                    class="btn btn-secondary text-sm"
                  >
                    导出PDF
                  </button>
                  <button
                    @click="saveFile"
                    :disabled="!hasChanges"
                    class="btn btn-primary text-sm"
                  >
                    保存
                  </button>
                </div>
              </div>
              
              <div class="border border-gray-200 rounded-lg overflow-hidden">
                <!-- Side-by-side mode -->
                <div v-if="sideBySideMode" class="flex h-96">
                  <div class="w-1/2 border-r border-gray-200">
                    <textarea
                      ref="editorRef"
                      v-model="fileContent"
                      class="w-full h-full p-4 font-mono text-sm border-none outline-none resize-none"
                      placeholder="开始编写您的笔记..."
                      @scroll="onEditorScroll"
                    />
                  </div>
                  <div class="w-1/2">
                    <div ref="pdfExportContainer" class="p-4 markdown-content max-w-none h-full overflow-y-auto" v-html="renderedContent" @scroll="onPreviewScroll"></div>
                  </div>
                </div>
                
                <!-- Single mode -->
                <div v-else>
                  <div v-if="!showPreview" class="h-96">
                    <textarea
                      ref="editorRef"
                      v-model="fileContent"
                      class="w-full h-full p-4 font-mono text-sm border-none outline-none resize-none"
                      placeholder="开始编写您的笔记..."
                      @scroll="onEditorScroll"
                    />
                  </div>
                  
                  <div v-else ref="pdfExportContainer" class="p-4 markdown-content max-w-none h-96 overflow-y-auto" v-html="renderedContent" @scroll="onPreviewScroll"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <div
      v-if="contextMenu.show"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      class="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
      @click.stop
    >
      <button
        @click="showRenameModal(contextMenu.type, contextMenu.item)"
        class="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
      >
        <Edit class="w-4 h-4 mr-2" />
        重命名
      </button>
      <button
        v-if="contextMenu.type === 'file'"
        @click="downloadFile(contextMenu.item)"
        class="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
      >
        <Download class="w-4 h-4 mr-2" />
        下载
      </button>
      <button
        @click="deleteItem(contextMenu.type, contextMenu.item.id)"
        class="w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600 flex items-center"
      >
        <Trash2 class="w-4 h-4 mr-2" />
        删除
      </button>
    </div>

    <!-- Rename Modal -->
    <div v-if="showRenameModalState" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="card p-6 w-full max-w-md">
        <h3 class="text-lg font-medium mb-4">
          重命名{{ renameItem.type === 'folder' ? '文件夹' : '文件' }}
        </h3>
        <input
          v-model="renameItem.newName"
          type="text"
          class="input mb-4"
          :placeholder="'输入新的' + (renameItem.type === 'folder' ? '文件夹' : '文件') + '名称'"
          @keyup.enter="confirmRename"
        />
        <div class="flex justify-end space-x-2">
          <button @click="hideRenameModal" class="btn btn-secondary">
            取消
          </button>
          <button @click="confirmRename" class="btn btn-primary">
            确认
          </button>
        </div>
      </div>
    </div>

    <!-- New Folder Modal -->
    <div v-if="showNewFolderModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="card p-6 w-full max-w-md">
        <h3 class="text-lg font-medium mb-4">新建文件夹</h3>
        <input
          v-model="newFolderName"
          type="text"
          class="input mb-4"
          placeholder="输入文件夹名称"
          @keyup.enter="createFolder"
        />
        <div class="flex justify-end space-x-2">
          <button @click="showNewFolderModal = false" class="btn btn-secondary">
            取消
          </button>
          <button @click="createFolder" class="btn btn-primary">
            创建
          </button>
        </div>
      </div>
    </div>

    <!-- New File Modal -->
    <div v-if="showNewFileModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="card p-6 w-full max-w-md">
        <h3 class="text-lg font-medium mb-4">新建文件</h3>
        <input
          v-model="newFileName"
          type="text"
          class="input mb-4"
          placeholder="输入文件名 (如: note.md)"
          @keyup.enter="createFile"
        />
        <div class="flex justify-end space-x-2">
          <button @click="showNewFileModal = false" class="btn btn-secondary">
            取消
          </button>
          <button @click="createFile" class="btn btn-primary">
            创建
          </button>
        </div>
      </div>
    </div>

    <!-- User Settings Modal -->
    <div v-if="showUserSettings" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="card p-6 w-full max-w-md">
        <h3 class="text-lg font-medium mb-4">用户设置</h3>
        
        <!-- Change Password Section -->
        <div class="mb-6">
          <h4 class="text-md font-medium mb-3">修改密码</h4>
          <input
            v-model="passwordForm.currentPassword"
            type="password"
            class="input mb-3"
            placeholder="当前密码"
          />
          <input
            v-model="passwordForm.newPassword"
            type="password"
            class="input mb-3"
            placeholder="新密码 (最少6位)"
          />
          <input
            v-model="passwordForm.confirmPassword"
            type="password"
            class="input mb-3"
            placeholder="确认新密码"
          />
          <button @click="changePassword" class="btn btn-primary w-full mb-3">
            修改密码
          </button>
        </div>

        <!-- Download Section -->
        <div class="mb-6">
          <h4 class="text-md font-medium mb-3">数据导出</h4>
          <button @click="downloadAllData" class="btn btn-secondary w-full" :disabled="isDownloading">
            {{ isDownloading ? '正在打包...' : '下载所有笔记' }}
          </button>
          <p class="text-sm text-gray-500 mt-2">
            将所有笔记和文件夹结构打包下载为ZIP文件
          </p>
        </div>

        <div class="flex justify-end space-x-2">
          <button @click="closeUserSettings" class="btn btn-secondary">
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFilesStore } from '@/stores/files'
import { marked } from 'marked'
import katex from 'katex'
import hljs from 'highlight.js'
import {
  Folder,
  FolderPlus,
  FileText,
  FilePlus,
  Upload,
  Download,
  Trash2,
  Edit
} from 'lucide-vue-next'

export default {
  name: 'Dashboard',
  components: {
    Folder,
    FolderPlus,
    FileText,
    FilePlus,
    Upload,
    Download,
    Trash2,
    Edit
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const filesStore = useFilesStore()
    
    const selectedFile = ref(null)
    const fileContent = ref('')
    const originalContent = ref('')
    const showPreview = ref(false)
    const sideBySideMode = ref(false)
    const editorRef = ref(null)
    const isScrollSyncing = ref(false)
    const showNewFolderModal = ref(false)
    const showNewFileModal = ref(false)
    const newFolderName = ref('')
    const newFileName = ref('')
    
    // 选定文件相关
    const selectedFiles = ref([])
    const pdfExportContainer = ref(null)
    
    // 拖拽相关
    const draggedItem = ref(null)
    const dragOver = ref(null)
    const touchStartPos = ref({ x: 0, y: 0 })
    const touchItem = ref(null)
    const isDragging = ref(false)
    const dragPreview = ref(null)
    
    // 右键菜单
    const contextMenu = ref({
      show: false,
      x: 0,
      y: 0,
      type: '',
      item: null
    })
    
    // 重命名
    const showRenameModalState = ref(false)
    const renameItem = ref({
      type: '',
      item: null,
      newName: ''
    })
    
    // 用户设置
    const showUserSettings = ref(false)
    const isDownloading = ref(false)
    const passwordForm = ref({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    
    const hasChanges = computed(() => fileContent.value !== originalContent.value)
    
    // 生成中文友好的标题ID
    const generateHeaderId = (text) => {
      // 移除markdown语法和特殊字符，保留中文、英文、数字
      let cleanText = text
        .replace(/[#*_`~\[\]()]/g, '') // 移除markdown语法字符
        .replace(/[^\u4e00-\u9fa5\w\s.-]/g, '') // 只保留中文、英文、数字、空格、点、连字符
        .trim()
      
      // 对于包含数字编号的标题（如 "1. 基础概念"），保持数字和点
      let id = cleanText.replace(/\s+/g, '-').toLowerCase()
      
      // 如果全是中文和数字，使用原文本的URLEncode形式
      if (/^[\u4e00-\u9fa5\d.-]+$/.test(id)) {
        return encodeURIComponent(cleanText)
      }
      
      return id || 'header'
    }

    const renderedContent = computed(() => {
      if (!fileContent.value) return ''
      
      // Step 1: Protect LaTeX blocks before Markdown processing
      let text = fileContent.value
      let latexBlocks = []
      let latexCounter = 0
      
      // Extract and protect block math ($$...$$)
      text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
        const placeholder = `<!--LATEX_BLOCK_${latexCounter}-->`
        latexBlocks[latexCounter] = content
        latexCounter++
        return placeholder
      })
      
      // Step 2: Process TOC if present
      let hasTOC = false
      if (text.includes('[[TOC]]') || text.includes('[TOC]') || /^\s*\[toc\]\s*$/mi.test(text)) {
        hasTOC = true
        // 临时替换TOC标记
        text = text.replace(/\[\[TOC\]\]|\[TOC\]|^\s*\[toc\]\s*$/gmi, '<!--TOC_PLACEHOLDER-->')
      }
      
      // Step 3: Configure marked with custom renderer
      const renderer = new marked.Renderer()
      const headings = []
      
      // 自定义标题渲染器
      renderer.heading = function(text, level) {
        const id = generateHeaderId(text)
        headings.push({ level, text, id })
        return `<h${level} id="${id}" class="markdown-heading">${text}</h${level}>`
      }
      
      // 自定义链接渲染器，处理内部链接
      renderer.link = function(href, title, text) {
        // 处理内部链接（以#开头）
        if (href && href.startsWith('#')) {
          const titleAttr = title ? ` title="${title}"` : ''
          const targetId = href.substring(1)
          return `<a href="${href}" class="internal-link"${titleAttr} onclick="event.preventDefault(); event.stopPropagation(); window.scrollToElement && window.scrollToElement('${targetId}'); return false;">${text}</a>`
        }
        // 处理外部链接
        const titleAttr = title ? ` title="${title}"` : ''
        return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`
      }
      
      marked.setOptions({
        renderer: renderer,
        highlight: (code, lang) => {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value
          }
          return hljs.highlightAuto(code).value
        },
        breaks: true,
        gfm: true
      })
      
      let html = marked.parse(text)
      
      // Step 4: Generate and insert TOC if needed
      if (hasTOC && headings.length > 0) {
        const tocHtml = generateTOC(headings)
        html = html.replace(/<!--TOC_PLACEHOLDER-->/g, tocHtml)
      }
      
      // Step 5: Restore LaTeX blocks and process them
      html = html.replace(/<!--LATEX_BLOCK_(\d+)-->/g, (match, index) => {
        const mathContent = latexBlocks[parseInt(index)]
        try {
          return `<div class="katex-display">${katex.renderToString(mathContent, { 
            displayMode: true,
            throwOnError: false,
            strict: false,
            trust: true
          })}</div>`
        } catch (e) {
          console.error('Block math error:', e)
          return `<div class="text-red-500 p-2 bg-red-50 border border-red-200 rounded">LaTeX Error: ${e.message}</div>`
        }
      })
      
      // Step 6: Handle inline math ($...$)
      html = html.replace(/\$([^$]+?)\$/g, (match, math) => {
        try {
          let mathContent = math.trim()
          mathContent = mathContent.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
          mathContent = mathContent.replace(/\\\s+/g, '\\\\ ')
          
          return katex.renderToString(mathContent, { 
            displayMode: false,
            throwOnError: false,
            strict: false,
            trust: true
          })
        } catch (e) {
          console.error('Inline math error:', e)
          return `<span class="text-red-500 bg-red-50 px-1 rounded text-sm">LaTeX Error: ${e.message}</span>`
        }
      })
      
      return html
    })
    
    // 生成TOC HTML
    const generateTOC = (headings) => {
      if (headings.length === 0) return ''
      
      let toc = '<div class="table-of-contents">\n<h3 class="toc-title">目录</h3>\n<ul class="toc-list">\n'
      
      let currentLevel = 0
      
      headings.forEach((heading, index) => {
        const { level, text, id } = heading
        
        if (level > currentLevel) {
          // 开始新的嵌套级别
          for (let i = currentLevel; i < level - 1; i++) {
            toc += '<ul>\n'
          }
        } else if (level < currentLevel) {
          // 结束嵌套级别
          for (let i = level; i < currentLevel; i++) {
            toc += '</ul>\n'
          }
        }
        
        toc += `<li><a href="#${id}" class="toc-link" onclick="event.preventDefault(); event.stopPropagation(); window.scrollToElement && window.scrollToElement('${id}'); return false;">${text}</a></li>\n`
        currentLevel = level
      })
      
      // 闭合剩余的ul标签
      for (let i = 1; i < currentLevel; i++) {
        toc += '</ul>\n'
      }
      
      toc += '</ul>\n</div>'
      return toc
    }
    
    const logout = () => {
      authStore.logout()
      router.push('/login')
    }
    
    const loadFiles = async () => {
      await filesStore.loadFileTree(filesStore.currentFolder)
    }
    
    const openFolder = async (folder) => {
      // Check for unsaved changes before navigating
      if (hasChanges.value) {
        const confirmNavigate = confirm('您有未保存的更改，是否要放弃并切换文件夹？')
        if (!confirmNavigate) {
          return
        }
      }
      
      await filesStore.navigateToFolder(folder.id, folder.name)
      // Clear selected file when navigating
      selectedFile.value = null
      fileContent.value = ''
      originalContent.value = ''
    }
    
    const openFile = async (file) => {
      // Check for unsaved changes before opening new file
      if (hasChanges.value) {
        const confirmSwitch = confirm('您有未保存的更改，是否要放弃并打开新文件？')
        if (!confirmSwitch) {
          return
        }
      }
      
      // Check if this is an uploaded file (non-markdown)
      if (file.is_uploaded && !file.name.toLowerCase().endsWith('.md')) {
        // For non-markdown uploaded files, download instead of opening in editor
        await downloadFile(file)
        return
      }
      
      const result = await filesStore.getFile(file.id)
      if (result.success) {
        selectedFile.value = result.file
        fileContent.value = result.file.content || ''
        originalContent.value = result.file.content || ''
        showPreview.value = false
      }
    }
    
    const saveFile = async () => {
      if (!selectedFile.value || !hasChanges.value) return
      
      const result = await filesStore.saveFile(selectedFile.value.id, fileContent.value)
      if (result.success) {
        originalContent.value = fileContent.value
        selectedFile.value = result.file
      }
    }
    
    const togglePreview = () => {
      if (sideBySideMode.value) {
        // If in side-by-side mode, switch to preview-only mode
        sideBySideMode.value = false
        showPreview.value = true
      } else {
        // Toggle between edit and preview modes
        showPreview.value = !showPreview.value
      }
      
      // Sync scroll position when switching modes
      if (showPreview.value && !sideBySideMode.value && editorRef.value && pdfExportContainer.value) {
        // Calculate relative scroll position from editor
        const editorScrollRatio = editorRef.value.scrollTop / (editorRef.value.scrollHeight - editorRef.value.clientHeight)
        
        // Apply to preview after a short delay to ensure rendering
        setTimeout(() => {
          if (pdfExportContainer.value) {
            const previewScrollTop = editorScrollRatio * (pdfExportContainer.value.scrollHeight - pdfExportContainer.value.clientHeight)
            pdfExportContainer.value.scrollTop = Math.max(0, previewScrollTop)
          }
        }, 100)
      }
    }
    
    const onEditorScroll = () => {
      if (isScrollSyncing.value || (!showPreview.value && !sideBySideMode.value)) return
      
      isScrollSyncing.value = true
      
      if (editorRef.value && pdfExportContainer.value) {
        const scrollRatio = editorRef.value.scrollTop / (editorRef.value.scrollHeight - editorRef.value.clientHeight)
        const previewScrollTop = scrollRatio * (pdfExportContainer.value.scrollHeight - pdfExportContainer.value.clientHeight)
        pdfExportContainer.value.scrollTop = Math.max(0, previewScrollTop)
      }
      
      setTimeout(() => {
        isScrollSyncing.value = false
      }, 100)
    }
    
    const onPreviewScroll = () => {
      if (isScrollSyncing.value || (!showPreview.value && !sideBySideMode.value)) return
      
      isScrollSyncing.value = true
      
      if (pdfExportContainer.value && editorRef.value) {
        const scrollRatio = pdfExportContainer.value.scrollTop / (pdfExportContainer.value.scrollHeight - pdfExportContainer.value.clientHeight)
        const editorScrollTop = scrollRatio * (editorRef.value.scrollHeight - editorRef.value.clientHeight)
        editorRef.value.scrollTop = Math.max(0, editorScrollTop)
      }
      
      setTimeout(() => {
        isScrollSyncing.value = false
      }, 100)
    }
    
    const toggleSideBySide = () => {
      if (sideBySideMode.value) {
        // If currently in side-by-side mode, switch to edit mode
        sideBySideMode.value = false
        showPreview.value = false
      } else {
        // Switch to side-by-side mode
        sideBySideMode.value = true
        showPreview.value = false // Reset preview mode when enabling side-by-side
      }
    }
    
    const getCurrentModeText = () => {
      if (sideBySideMode.value) {
        return '预览模式' // 在并排模式下，点击会切换到单独预览模式
      } else if (showPreview.value) {
        return '编辑模式' // 在预览模式下，点击会切换到编辑模式
      } else {
        return '预览模式' // 在编辑模式下，点击会切换到预览模式
      }
    }
    
    const createFolder = async () => {
      if (!newFolderName.value.trim()) return
      
      const result = await filesStore.createFolder(
        newFolderName.value.trim(),
        filesStore.currentFolder
      )
      
      if (result.success) {
        newFolderName.value = ''
        showNewFolderModal.value = false
      }
    }
    
    const createFile = async () => {
      if (!newFileName.value.trim()) return
      
      const result = await filesStore.createFile(
        newFileName.value.trim(),
        '',
        filesStore.currentFolder
      )
      
      if (result.success) {
        newFileName.value = ''
        showNewFileModal.value = false
        openFile(result.file)
      }
    }
    
    const handleFileUpload = async (event) => {
      const files = Array.from(event.target.files)
      
      for (const file of files) {
        await filesStore.uploadFile(file, filesStore.currentFolder)
      }
      
      event.target.value = ''
    }
    
    const downloadFile = async (file) => {
      await filesStore.downloadFile(file.id, file.name)
    }
    
    const deleteItem = async (type, id) => {
      if (!confirm(`确定要删除这个${type === 'folder' ? '文件夹' : '文件'}吗？`)) {
        return
      }
      
      if (type === 'folder') {
        await filesStore.deleteFolder(id)
      } else {
        await filesStore.deleteFile(id)
        if (selectedFile.value && selectedFile.value.id === id) {
          selectedFile.value = null
          fileContent.value = ''
          originalContent.value = ''
        }
      }
    }
    
    const goHome = async () => {
      // Check for unsaved changes before navigating home
      if (hasChanges.value) {
        const confirmNavigate = confirm('您有未保存的更改，是否要放弃并返回根目录？')
        if (!confirmNavigate) {
          return
        }
      }
      
      await filesStore.loadFileTree(null)
      // Clear selected file when going home
      selectedFile.value = null
      fileContent.value = ''
      originalContent.value = ''
    }
    
    const navigateToLevel = async (index) => {
      // Check for unsaved changes before navigating
      if (hasChanges.value) {
        const confirmNavigate = confirm('您有未保存的更改，是否要放弃并切换文件夹？')
        if (!confirmNavigate) {
          return
        }
      }
      
      // 截断到指定层级
      const targetStack = filesStore.folderStack.slice(0, index + 1)
      filesStore.folderStack = targetStack
      
      const parentId = targetStack.length > 0 ? 
        targetStack[targetStack.length - 1].id : null
      await filesStore.loadFileTree(parentId)
      
      // Clear selected file when navigating
      selectedFile.value = null
      fileContent.value = ''
      originalContent.value = ''
    }
    
    // 拖拽处理
    const onDragStart = (event, type, item) => {
      draggedItem.value = { type, item }
      event.dataTransfer.effectAllowed = 'move'
    }
    
    const onDragEnd = () => {
      draggedItem.value = null
      dragOver.value = null
    }
    
    // Mobile touch events
    const onTouchStart = (event, type, item) => {
      const touch = event.touches[0]
      touchStartPos.value = { x: touch.clientX, y: touch.clientY }
      touchItem.value = { type, item }
      isDragging.value = false
    }
    
    const onTouchMove = (event) => {
      if (!touchItem.value) return
      
      const touch = event.touches[0]
      const dx = touch.clientX - touchStartPos.value.x
      const dy = touch.clientY - touchStartPos.value.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 10 && !isDragging.value) {
        isDragging.value = true
        draggedItem.value = touchItem.value
        event.preventDefault()
        
        // Create drag preview
        createDragPreview(touchItem.value, touch.clientX, touch.clientY)
      }
      
      if (isDragging.value) {
        event.preventDefault()
        updateDragPreview(touch.clientX, touch.clientY)
        
        // Check drop zones
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY)
        if (elementUnder) {
          const dropZone = elementUnder.closest('[data-drop-zone]')
          if (dropZone) {
            const folderId = dropZone.getAttribute('data-drop-zone')
            if (folderId === 'null') {
              dragOver.value = 'root'
            } else if (folderId === 'parent') {
              dragOver.value = 'parent'
            } else if (filesStore.folderStack.some(f => f.id.toString() === folderId)) {
              dragOver.value = `breadcrumb-${folderId}`
            } else {
              dragOver.value = folderId
            }
          } else {
            dragOver.value = null
          }
        }
      }
    }
    
    const onTouchEnd = async (event) => {
      if (isDragging.value && draggedItem.value) {
        const touch = event.changedTouches[0]
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY)
        
        if (elementUnder) {
          const dropZone = elementUnder.closest('[data-drop-zone]')
          if (dropZone) {
            const folderId = dropZone.getAttribute('data-drop-zone')
            let targetId
            
            if (folderId === 'null') {
              targetId = null // 根目录
            } else if (folderId === 'parent') {
              // 移动到上一级目录
              if (filesStore.folderStack.length === 0) {
                targetId = null // 已经在根目录，无法上移
                return
              } else if (filesStore.folderStack.length === 1) {
                targetId = null // 上一级是根目录
              } else {
                targetId = filesStore.folderStack[filesStore.folderStack.length - 2].id
              }
            } else {
              targetId = parseInt(folderId)
            }
            
            const { type, item } = draggedItem.value
            
            // 防止移动到相同位置
            if (targetId === filesStore.currentFolder) {
              return
            }
            
            if (type === 'file') {
              const result = await filesStore.moveFile(item.id, targetId)
              if (result.success) {
                await filesStore.loadFileTree(filesStore.currentFolder)
              }
            } else if (type === 'folder') {
              if (item.id !== targetId) {
                const result = await filesStore.moveFolder(item.id, targetId)
                if (result.success) {
                  await filesStore.loadFileTree(filesStore.currentFolder)
                }
              }
            }
          }
        }
      }
      
      // Clean up
      removeDragPreview()
      touchItem.value = null
      draggedItem.value = null
      isDragging.value = false
      dragOver.value = null
    }
    
    const createDragPreview = (item, x, y) => {
      const preview = document.createElement('div')
      preview.className = 'fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-2 pointer-events-none'
      preview.style.left = x + 'px'
      preview.style.top = (y - 30) + 'px'
      preview.innerHTML = `
        <div class="flex items-center text-sm">
          ${item.type === 'folder' ? 
            '<svg class="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>' : 
            '<svg class="w-4 h-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path></svg>'
          }
          ${item.item.name}
        </div>
      `
      document.body.appendChild(preview)
      dragPreview.value = preview
    }
    
    const updateDragPreview = (x, y) => {
      if (dragPreview.value) {
        dragPreview.value.style.left = x + 'px'
        dragPreview.value.style.top = (y - 30) + 'px'
      }
    }
    
    const removeDragPreview = () => {
      if (dragPreview.value) {
        document.body.removeChild(dragPreview.value)
        dragPreview.value = null
      }
    }
    
    const onDragOver = (event, folderId) => {
      event.preventDefault()
      dragOver.value = folderId
    }
    
    const onDragLeave = () => {
      dragOver.value = null
    }
    
    const onDragOverBreadcrumb = (event, folderId) => {
      event.preventDefault()
      if (folderId === null) {
        dragOver.value = 'root'
      } else {
        dragOver.value = `breadcrumb-${folderId}`
      }
    }
    
    const onDragLeaveBreadcrumb = () => {
      dragOver.value = null
    }
    
    const onDropOnBreadcrumb = async (event, targetFolderId) => {
      event.preventDefault()
      dragOver.value = null
      
      if (!draggedItem.value) return
      
      const { type, item } = draggedItem.value
      
      // Basic validations
      if (type === 'folder' && item.id === targetFolderId) {
        return // Can't move folder to itself
      }
      
      try {
        if (type === 'file') {
          const result = await filesStore.moveFile(item.id, targetFolderId)
          if (result.success) {
            await filesStore.loadFileTree(filesStore.currentFolder)
          }
        } else if (type === 'folder') {
          const result = await filesStore.moveFolder(item.id, targetFolderId)
          if (result.success) {
            await filesStore.loadFileTree(filesStore.currentFolder)
          }
        }
      } catch (error) {
        console.error('Move operation failed:', error)
      }
      
      draggedItem.value = null
    }
    
    const onDropOnFolder = async (event, targetFolderId) => {
      event.preventDefault()
      dragOver.value = null
      
      if (!draggedItem.value) return
      
      const { type, item } = draggedItem.value
      
      if (type === 'file') {
        const result = await filesStore.moveFile(item.id, targetFolderId)
        if (result.success) {
          // 刷新当前文件夹显示
          await filesStore.loadFileTree(filesStore.currentFolder)
        }
      } else if (type === 'folder') {
        if (item.id === targetFolderId) return // 不能移动到自己
        
        const result = await filesStore.moveFolder(item.id, targetFolderId)
        if (result.success) {
          // 刷新当前文件夹显示
          await filesStore.loadFileTree(filesStore.currentFolder)
        }
      }
      
      draggedItem.value = null
    }
    
    const onDropToParent = async (event) => {
      event.preventDefault()
      
      if (!draggedItem.value) return
      
      const { type, item } = draggedItem.value
      
      // 计算上一级目录ID
      let parentFolderId
      if (filesStore.folderStack.length === 0) {
        // 已经在根目录，无法上移
        draggedItem.value = null
        dragOver.value = null
        return
      } else if (filesStore.folderStack.length === 1) {
        parentFolderId = null // 上一级是根目录
      } else {
        parentFolderId = filesStore.folderStack[filesStore.folderStack.length - 2].id
      }
      
      // 防止移动到相同位置
      if (parentFolderId === filesStore.currentFolder) {
        draggedItem.value = null
        dragOver.value = null
        return
      }
      
      try {
        if (type === 'file') {
          const result = await filesStore.moveFile(item.id, parentFolderId)
          if (result.success) {
            await filesStore.loadFileTree(filesStore.currentFolder)
          }
        } else if (type === 'folder') {
          if (item.id !== parentFolderId) {
            const result = await filesStore.moveFolder(item.id, parentFolderId)
            if (result.success) {
              await filesStore.loadFileTree(filesStore.currentFolder)
            }
          }
        }
      } catch (error) {
        console.error('Move to parent failed:', error)
      }
      
      draggedItem.value = null
      dragOver.value = null
    }
    
    // 右键菜单处理
    const showContextMenu = (event, type, item) => {
      contextMenu.value = {
        show: true,
        x: event.clientX,
        y: event.clientY,
        type,
        item
      }
    }
    
    const hideContextMenu = () => {
      contextMenu.value.show = false
    }
    
    // 重命名处理
    const showRenameModal = (type, item) => {
      renameItem.value = {
        type,
        item,
        newName: item.name
      }
      showRenameModalState.value = true
      hideContextMenu()
    }
    
    const hideRenameModal = () => {
      showRenameModalState.value = false
      renameItem.value = { type: '', item: null, newName: '' }
    }
    
    const confirmRename = async () => {
      if (!renameItem.value.newName.trim()) return
      
      const { type, item, newName } = renameItem.value
      
      let result
      if (type === 'file') {
        result = await filesStore.renameFile(item.id, newName.trim())
      } else {
        result = await filesStore.renameFolder(item.id, newName.trim())
      }
      
      if (result.success) {
        hideRenameModal()
        // 刷新文件列表
        await filesStore.loadFileTree(filesStore.currentFolder)
      }
    }
    
    // Warn before leaving with unsaved changes
    const beforeUnloadHandler = (event) => {
      if (hasChanges.value) {
        event.preventDefault()
        event.returnValue = ''
        return ''
      }
    }
    
    // 全局滚动函数，用于处理内部链接跳转
    const scrollToElement = (targetId) => {
      console.log('Scrolling to element:', targetId)
      
      // 尝试多种方式查找元素
      let element = null
      const allElements = document.querySelectorAll('[id]')
      const availableIds = Array.from(allElements).map(el => el.id)
      
      // 方法1：直接查找
      element = document.getElementById(targetId)
      
      if (!element) {
        // 方法2：尝试URL解码
        try {
          const decodedId = decodeURIComponent(targetId)
          element = document.getElementById(decodedId)
          console.log('Trying decoded ID:', decodedId, element)
        } catch (e) {
          console.log('Decode failed:', e)
        }
      }
      
      if (!element) {
        // 方法3：尝试URL编码
        try {
          const encodedId = encodeURIComponent(targetId)
          element = document.getElementById(encodedId)
          console.log('Trying encoded ID:', encodedId, element)
        } catch (e) {
          console.log('Encode failed:', e)
        }
      }
      
      if (!element) {
        // 方法4：智能模糊匹配
        console.log('Trying fuzzy matching for:', targetId)
        
        // 解析目标ID中的文本内容
        let targetText = targetId
        
        // 尝试解码
        try {
          targetText = decodeURIComponent(targetId)
        } catch (e) {
          // 如果解码失败，使用原始文本
        }
        
        // 清理目标文本：移除数字、点、连字符、空格等
        const cleanTarget = targetText
          .replace(/^\d+[.\-\s]*/, '') // 移除开头的数字编号
          .replace(/[.\-_\s%]+/g, '') // 移除所有标点符号
          .toLowerCase()
        
        console.log('Clean target text:', cleanTarget)
        
        // 在所有ID中查找匹配
        for (const id of availableIds) {
          // 解码ID
          let decodedId = id
          try {
            decodedId = decodeURIComponent(id)
          } catch (e) {
            // 如果解码失败，使用原始ID
          }
          
          // 清理ID文本
          const cleanId = decodedId
            .replace(/^\d+[.\-\s]*/, '') // 移除开头的数字编号
            .replace(/[.\-_\s%]+/g, '') // 移除所有标点符号
            .toLowerCase()
          
          // 检查是否匹配
          if (cleanId === cleanTarget || 
              cleanId.includes(cleanTarget) || 
              cleanTarget.includes(cleanId)) {
            element = document.getElementById(id)
            console.log('Fuzzy match found:', {
              originalId: id,
              decodedId: decodedId,
              cleanId: cleanId,
              targetId: targetId,
              cleanTarget: cleanTarget,
              element: element
            })
            break
          }
        }
      }
      
      if (element) {
        console.log('Found element:', element)
        const container = pdfExportContainer.value
        if (container && (showPreview.value || sideBySideMode.value)) {
          // 在预览模式或并排模式下，在预览容器内滚动
          const elementOffsetTop = element.offsetTop
          console.log('Scrolling in preview container to:', elementOffsetTop)
          container.scrollTo({
            top: elementOffsetTop - 20,
            behavior: 'smooth'
          })
        } else {
          // 默认情况下使用页面滚动
          console.log('Using page scroll')
          element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          })
        }
      } else {
        console.error('Element not found:', targetId)
        console.log('Available IDs:', availableIds)
      }
    }
    
    onMounted(async () => {
      await authStore.fetchUser()
      await loadFiles()
      
      // 将scrollToElement函数挂载到全局供 HTML中的onclick使用
      window.scrollToElement = scrollToElement
      
      // 点击其他地方隐藏右键菜单
      document.addEventListener('click', hideContextMenu)
      
      // Add beforeunload handler
      window.addEventListener('beforeunload', beforeUnloadHandler)
    })
    
    onUnmounted(() => {
      document.removeEventListener('click', hideContextMenu)
      window.removeEventListener('beforeunload', beforeUnloadHandler)
      
      // 清理全局函数
      if (window.scrollToElement) {
        delete window.scrollToElement
      }
      
      // Clean up drag preview if exists
      removeDragPreview()
    })
    
    // 用户设置方法
    const closeUserSettings = () => {
      showUserSettings.value = false
      passwordForm.value = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    }
    
    const changePassword = async () => {
      try {
        if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword) {
          alert('请填写当前密码和新密码')
          return
        }
        
        if (passwordForm.value.newPassword.length < 6) {
          alert('新密码长度不能少于6位')
          return
        }
        
        if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
          alert('两次输入的新密码不一致')
          return
        }
        
        const response = await fetch('/api/auth/change-password', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({
            currentPassword: passwordForm.value.currentPassword,
            newPassword: passwordForm.value.newPassword
          })
        })
        
        const data = await response.json()
        
        if (response.ok) {
          alert('密码修改成功')
          closeUserSettings()
        } else {
          alert(data.message || '修改密码失败')
        }
      } catch (error) {
        console.error('Change password error:', error)
        alert('修改密码失败，请重试')
      }
    }
    
    // 选定文件相关方法
    const toggleFileSelection = (fileId) => {
      const index = selectedFiles.value.indexOf(fileId)
      if (index > -1) {
        selectedFiles.value.splice(index, 1)
      } else {
        selectedFiles.value.push(fileId)
      }
    }
    
    const downloadSelectedFiles = async () => {
      if (selectedFiles.value.length === 0) {
        alert('请先选择要下载的文件')
        return
      }
      
      try {
        for (const fileId of selectedFiles.value) {
          const file = filesStore.files.find(f => f.id === fileId)
          if (file) {
            await filesStore.downloadFile(fileId, file.name)
            // 添加延迟避免同时下载太多文件
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
        // 下载完成后清空选择
        selectedFiles.value = []
      } catch (error) {
        console.error('Download selected files error:', error)
        alert('下载文件失败，请重试')
      }
    }
    
    // PDF导出功能 - 使用后端生成高质量PDF
    const exportToPDF = async () => {
      if (!selectedFile.value) {
        alert('没有可导出的内容')
        return
      }
      
      try {
        const response = await fetch(`/api/pdf/export/${selectedFile.value.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({
            options: {
              format: 'A4',
              margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
              printBackground: true
            }
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'PDF导出失败')
        }
        
        // 获取文件名
        const contentDisposition = response.headers.get('content-disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '').replace(/.*=/, '')
          : `${selectedFile.value.name.replace(/\.[^/.]+$/, '')}.pdf`
        
        // 创建blob并下载
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = decodeURIComponent(filename)
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
      } catch (error) {
        console.error('PDF export error:', error)
        alert(`PDF导出失败: ${error.message}`)
      }
    }
    
    const downloadAllData = async () => {
      try {
        isDownloading.value = true
        
        const response = await fetch('/api/files/download-all', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })
        
        if (!response.ok) {
          throw new Error('下载失败')
        }
        
        // 获取文件名
        const contentDisposition = response.headers.get('content-disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : `cloud-note-backup-${new Date().toISOString().split('T')[0]}.zip`
        
        // 创建blob并下载
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        alert('下载完成')
      } catch (error) {
        console.error('Download error:', error)
        alert('下载失败，请重试')
      } finally {
        isDownloading.value = false
      }
    }
    
    return {
      authStore,
      filesStore,
      selectedFile,
      fileContent,
      originalContent,
      showPreview,
      sideBySideMode,
      editorRef,
      showNewFolderModal,
      showNewFileModal,
      newFolderName,
      newFileName,
      hasChanges,
      renderedContent,
      // 选定文件相关
      selectedFiles,
      pdfExportContainer,
      toggleFileSelection,
      downloadSelectedFiles,
      exportToPDF,
      logout,
      openFolder,
      openFile,
      saveFile,
      togglePreview,
      toggleSideBySide,
      getCurrentModeText,
      onEditorScroll,
      onPreviewScroll,
      createFolder,
      createFile,
      handleFileUpload,
      downloadFile,
      deleteItem,
      goHome,
      navigateToLevel,
      // 拖拽相关
      draggedItem,
      dragOver,
      onDragStart,
      onDragEnd,
      onDragOver,
      onDragLeave,
      onDropOnFolder,
      onDragOverBreadcrumb,
      onDragLeaveBreadcrumb,
      onDropOnBreadcrumb,
      onDropToParent,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      // 右键菜单
      contextMenu,
      showContextMenu,
      hideContextMenu,
      // 重命名
      showRenameModalState,
      renameItem,
      showRenameModal,
      hideRenameModal,
      confirmRename,
      // 用户设置
      showUserSettings,
      isDownloading,
      passwordForm,
      closeUserSettings,
      changePassword,
      downloadAllData
    }
  }
}
</script>

<style>
.markdown-content {
  max-width: none;
}

.markdown-content h1, .markdown-content h2, .markdown-content h3, .markdown-content h4, .markdown-content h5, .markdown-content h6 {
  margin-top: 1.5em !important;
  margin-bottom: 0.5em !important;
  font-weight: bold !important;
  color: #1f2937 !important;
}

.markdown-content h1 {
  font-size: 2em !important;
  border-bottom: 1px solid #e5e7eb !important;
  padding-bottom: 0.3em !important;
}

.markdown-content h2 {
  font-size: 1.5em !important;
  border-bottom: 1px solid #e5e7eb !important;
  padding-bottom: 0.3em !important;
}

.markdown-content h3 {
  font-size: 1.25em !important;
}

.markdown-content h4 {
  font-size: 1.125em !important;
}

.markdown-content h5 {
  font-size: 1em !important;
}

.markdown-content h6 {
  font-size: 0.875em !important;
}

.markdown-content p {
  margin-bottom: 1em;
}

.markdown-content pre {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 0.375rem;
  overflow-x: auto;
}

.markdown-content code {
  background-color: #f8f9fa;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.markdown-content blockquote {
  border-left: 4px solid #e5e7eb;
  padding-left: 1rem;
  margin: 1rem 0;
  font-style: italic;
  color: #6b7280;
}

.markdown-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.markdown-content th, .markdown-content td {
  border: 1px solid #e5e7eb;
  padding: 0.5rem;
  text-align: left;
}

.markdown-content th {
  background-color: #f9fafb;
  font-weight: 600;
}

.markdown-content ul {
  margin: 1em 0;
  padding-left: 2em;
  list-style-type: disc;
}

.markdown-content ol {
  margin: 1em 0;
  padding-left: 2em;
  list-style-type: decimal;
}

.markdown-content ul ul {
  list-style-type: circle;
}

.markdown-content ul ul ul {
  list-style-type: square;
}

.markdown-content li {
  margin: 0.25em 0;
  display: list-item;
}

/* LaTeX math styling */
.katex-display {
  margin: 1em 0;
  text-align: center;
  overflow-x: auto;
  overflow-y: visible;
}

.katex-display .katex {
  display: block;
  text-align: center;
}

.katex {
  font-size: 1.1em;
}

/* Ensure proper line breaks in LaTeX */
.katex .base {
  white-space: nowrap;
}

.katex .mord,
.katex .mrel,
.katex .mop,
.katex .mbin,
.katex .mpunct,
.katex .mopen,
.katex .mclose {
  white-space: nowrap;
}

.katex .arraycolsep {
  display: inline-block;
}

.katex .mtable {
  display: inline-table;
  vertical-align: middle;
}

.katex .mtable .col-align-c > .vlist-t {
  text-align: center;
}

.katex .mtable .col-align-l > .vlist-t {
  text-align: left;
}

.katex .mtable .col-align-r > .vlist-t {
  text-align: right;
}

/* Better typography */
.markdown-content strong, .markdown-content b {
  font-weight: bold !important;
}

.markdown-content em, .markdown-content i {
  font-style: italic !important;
}

.markdown-content del {
  text-decoration: line-through;
}

.markdown-content hr {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 2em 0;
}

/* Table of Contents styling */
.table-of-contents {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 2rem 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.toc-title {
  font-size: 1.25rem !important;
  font-weight: 600 !important;
  color: #374151 !important;
  margin: 0 0 1rem 0 !important;
  border: none !important;
  padding: 0 !important;
}

.toc-list {
  list-style: none !important;
  margin: 0 !important;
  padding: 0 !important;
}

.toc-list li {
  margin: 0.5rem 0 !important;
  padding: 0 !important;
  display: block !important;
}

.toc-list ul {
  list-style: none !important;
  margin: 0.5rem 0 0 1.5rem !important;
  padding: 0 !important;
}

.toc-link {
  color: #3b82f6 !important;
  text-decoration: none !important;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
  transition: all 0.2s ease;
  cursor: pointer;
}

.toc-link:hover {
  background-color: #dbeafe !important;
  color: #1d4ed8 !important;
  text-decoration: none !important;
}

/* Internal link styling */
.internal-link {
  color: #3b82f6 !important;
  text-decoration: underline !important;
  border: none;
  padding: 0;
  transition: all 0.2s ease;
  cursor: pointer;
}

.internal-link:hover {
  color: #1d4ed8 !important;
  text-decoration: underline !important;
}

/* Markdown heading styling for better anchor targets */
.markdown-heading {
  scroll-margin-top: 2rem;
  position: relative;
}

.markdown-heading:hover::before {
  content: '#';
  position: absolute;
  left: -1.5rem;
  color: #9ca3af;
  font-weight: normal;
  cursor: pointer;
}

/* External link styling */
a[target="_blank"] {
  color: #3b82f6 !important;
  text-decoration: none !important;
}

a[target="_blank"]:hover {
  text-decoration: underline !important;
}

a[target="_blank"]::after {
  content: ' ↗';
  font-size: 0.8em;
  opacity: 0.7;
}

/* Print styles for PDF export */
@media print {
  .table-of-contents {
    background: white;
    border: 1px solid #ccc;
    box-shadow: none;
    page-break-inside: avoid;
  }
  
  .internal-link, .toc-link {
    color: #3b82f6 !important;
    text-decoration: underline !important;
    background: none !important;
    border: none !important;
    padding: 0 !important;
  }
  
  .markdown-heading {
    page-break-after: avoid;
  }
  
  .markdown-heading:hover::before {
    display: none;
  }
  
  /* 隐藏链接地址，保持PDF简洁 */
  .internal-link::after {
    display: none !important;
  }
  
  .markdown-heading {
    page-break-after: avoid;
  }
  
  .markdown-heading:hover::before {
    display: none;
  }
  
  /* 保持链接可见性 */
  .internal-link::after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
    color: #666;
  }
  
  /* TOC在PDF中的特殊处理 */
  .toc-link::after {
    content: " .............................. " counter(page);
    text-decoration: none;
    color: #999;
  }
}
</style>