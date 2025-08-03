import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { getFileById } from '../utils/mysql-db.js'
import pdfGenerator from '../services/pdfGenerator.js'

const router = express.Router()

// PDF服务健康检查
router.get('/health', async (req, res) => {
  try {
    // 尝试初始化PDF生成器
    await pdfGenerator.initialize()
    
    res.json({ 
      status: 'ok', 
      message: 'PDF服务正常',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('PDF health check failed:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'PDF服务不可用',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// 导出文件为PDF
router.post('/export/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params
    const { options = {} } = req.body
    
    // 获取文件内容
    const file = await getFileById(parseInt(fileId))
    if (!file) {
      return res.status(404).json({ message: '文件不存在' })
    }
    
    // 检查用户权限
    if (file.user_id !== req.user.id) {
      return res.status(403).json({ message: '无权限访问此文件' })
    }
    
    // 生成PDF
    const pdfBuffer = await pdfGenerator.generatePDF(file.content, {
      title: file.name,
      ...options
    })
    
    // 设置响应头
    const filename = `${file.name.replace(/\.[^/.]+$/, '')}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    
    // 发送PDF
    res.send(pdfBuffer)
    
  } catch (error) {
    console.error('PDF export error:', error)
    res.status(500).json({ 
      message: 'PDF导出失败', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    })
  }
})

// 批量导出多个文件为PDF
router.post('/export-multiple', authenticateToken, async (req, res) => {
  try {
    const { fileIds, options = {} } = req.body
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ message: '请提供文件ID列表' })
    }
    
    // 获取所有文件
    const files = []
    for (const fileId of fileIds) {
      const file = await getFileById(parseInt(fileId))
      if (file && file.user_id === req.user.id) {
        files.push(file)
      }
    }
    
    if (files.length === 0) {
      return res.status(404).json({ message: '没有找到可导出的文件' })
    }
    
    // 合并所有文件内容
    const combinedContent = files.map(file => {
      return `# ${file.name}\n\n${file.content}\n\n---\n\n`
    }).join('')
    
    // 生成PDF
    const pdfBuffer = await pdfGenerator.generatePDF(combinedContent, {
      title: `合并文档_${new Date().toISOString().split('T')[0]}`,
      ...options
    })
    
    // 设置响应头
    const filename = `合并文档_${new Date().toISOString().split('T')[0]}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    
    // 发送PDF
    res.send(pdfBuffer)
    
  } catch (error) {
    console.error('Multiple PDF export error:', error)
    res.status(500).json({ 
      message: 'PDF批量导出失败', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    })
  }
})

export default router