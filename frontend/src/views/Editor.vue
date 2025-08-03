<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-4">
            <button
              @click="goBack"
              class="p-2 hover:bg-gray-100 rounded"
            >
              <ArrowLeft class="w-5 h-5" />
            </button>
            <h1 class="text-xl font-semibold text-gray-900">
              {{ file?.name || '编辑器' }}
            </h1>
            <div v-if="hasChanges" class="text-sm text-amber-600">
              未保存的更改
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <button
              @click="togglePreview"
              class="btn btn-secondary"
            >
              {{ showPreview ? '编辑模式' : '预览模式' }}
            </button>
            <button
              v-if="showPreview"
              @click="exportToPDF"
              class="btn btn-secondary"
            >
              导出PDF
            </button>
            <button
              @click="saveFile"
              :disabled="!hasChanges"
              class="btn btn-primary"
            >
              保存 (Ctrl+S)
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Editor Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="card">
        <div v-if="showPreview" ref="pdfExportContainer" class="markdown-content max-w-none p-6 h-screen overflow-y-auto" v-html="renderedContent" @scroll="onPreviewScroll"></div>
        
        <div v-else class="h-screen">
          <textarea
            ref="editorRef"
            v-model="content"
            class="w-full h-full p-6 font-mono text-sm border-none outline-none resize-none"
            placeholder="开始编写您的 Markdown 笔记..."
            @keydown="handleKeydown"
            @scroll="onEditorScroll"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFilesStore } from '@/stores/files'
import { marked } from 'marked'
import katex from 'katex'
import hljs from 'highlight.js'
import { ArrowLeft } from 'lucide-vue-next'

export default {
  name: 'Editor',
  components: {
    ArrowLeft
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const authStore = useAuthStore()
    const filesStore = useFilesStore()
    
    const file = ref(null)
    const content = ref('')
    const originalContent = ref('')
    const showPreview = ref(false)
    const editorRef = ref(null)
    const pdfExportContainer = ref(null)
    const isScrollSyncing = ref(false)
    
    const hasChanges = computed(() => content.value !== originalContent.value)
    
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
      if (!content.value) return ''
      
      // Step 1: Protect LaTeX blocks before Markdown processing
      let text = content.value
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
    
    const loadFile = async () => {
      const fileId = parseInt(route.params.path)
      if (!fileId) return
      
      const result = await filesStore.getFile(fileId)
      if (result.success) {
        file.value = result.file
        content.value = result.file.content || ''
        originalContent.value = result.file.content || ''
      } else {
        router.push('/dashboard')
      }
    }
    
    const saveFile = async () => {
      if (!file.value || !hasChanges.value) return
      
      const result = await filesStore.saveFile(file.value.id, content.value)
      if (result.success) {
        originalContent.value = content.value
        file.value = result.file
      }
    }
    
    const togglePreview = () => {
      showPreview.value = !showPreview.value
      
      // Sync scroll position when switching modes
      if (showPreview.value && editorRef.value && pdfExportContainer.value) {
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
      if (isScrollSyncing.value || !showPreview.value) return
      
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
      if (isScrollSyncing.value || showPreview.value) return
      
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
    
    // PDF导出功能 - 使用后端生成高质量PDF
    const exportToPDF = async () => {
      if (!file.value) {
        alert('没有可导出的内容')
        return
      }
      
      try {
        const response = await fetch(`/api/pdf/export/${file.value.id}`, {
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
          : `${file.value.name.replace(/\.[^/.]+$/, '')}.pdf`
        
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
    
    const handleKeydown = (event) => {
      // Save with Ctrl+S
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault()
        saveFile()
        return
      }
      
      // Tab insertion
      if (event.key === 'Tab') {
        event.preventDefault()
        const start = event.target.selectionStart
        const end = event.target.selectionEnd
        
        event.target.value = event.target.value.substring(0, start) + 
                           '  ' + 
                           event.target.value.substring(end)
        
        event.target.selectionStart = event.target.selectionEnd = start + 2
        content.value = event.target.value
      }
    }
    
    // Auto-save every 30 seconds
    let autoSaveInterval
    
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
        if (container && showPreview.value) {
          // 在预览模式下，在预览容器内滚动
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
      await loadFile()
      
      // 将scrollToElement函数挂载到全局供 HTML中的onclick使用
      window.scrollToElement = scrollToElement
      
      // Set up auto-save
      autoSaveInterval = setInterval(() => {
        if (hasChanges.value) {
          saveFile()
        }
      }, 30000)
      
      // Focus editor
      if (editorRef.value) {
        editorRef.value.focus()
      }
    })
    
    onUnmounted(() => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval)
      }
    })
    
    // Warn before leaving with unsaved changes
    const beforeUnloadHandler = (event) => {
      if (hasChanges.value) {
        event.preventDefault()
        event.returnValue = ''
        return ''
      }
    }
    
    onMounted(() => {
      window.addEventListener('beforeunload', beforeUnloadHandler)
    })
    
    onUnmounted(() => {
      window.removeEventListener('beforeunload', beforeUnloadHandler)
      // 清理全局函数
      if (window.scrollToElement) {
        delete window.scrollToElement
      }
    })
    
    const goBack = () => {
      // Check for unsaved changes before navigating back
      if (hasChanges.value) {
        const confirmLeave = confirm('您有未保存的更改，是否要放弃并返回？')
        if (!confirmLeave) {
          return
        }
      }
      router.push('/dashboard')
    }
    
    return {
      file,
      content,
      originalContent,
      showPreview,
      editorRef,
      pdfExportContainer,
      hasChanges,
      renderedContent,
      saveFile,
      togglePreview,
      exportToPDF,
      handleKeydown,
      onEditorScroll,
      onPreviewScroll,
      goBack
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
  
  /* TOC在PDF中的特殊处理 */
  .toc-link::after {
    content: " .............................. " counter(page);
    text-decoration: none;
    color: #999;
  }
}
</style>