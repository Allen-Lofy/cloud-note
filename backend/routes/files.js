import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs-extra'
import { fileURLToPath } from 'url'
import archiver from 'archiver'
import { authenticateToken } from '../middleware/auth.js'
import {
  findFilesByUser,
  findFoldersByUser,
  createFolder,
  createFile,
  updateFile,
  deleteFile,
  deleteFolder,
  renameFile,
  renameFolder,
  moveFile,
  moveFolder,
  getFileById,
  getFolderById,
  getAllFilesByUser,
  getAllFoldersByUser,
  getAllUsers
} from '../utils/mysql-db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads')
    fs.ensureDirSync(uploadPath)
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

// Get file tree
router.get('/tree', authenticateToken, async (req, res) => {
  try {
    const { parentId = null } = req.query
    const userId = req.user.id
    
    const folders = await findFoldersByUser(userId, parentId ? parseInt(parentId) : null)
    const files = await findFilesByUser(userId, parentId ? parseInt(parentId) : null)
    
    res.json({
      folders,
      files
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '获取文件树失败' })
  }
})

// Create folder
router.post('/folder', authenticateToken, async (req, res) => {
  try {
    const { name, parentId = null } = req.body
    const userId = req.user.id
    
    if (!name) {
      return res.status(400).json({ message: '文件夹名称不能为空' })
    }
    
    const folder = await createFolder({
      name,
      parentId: parentId ? parseInt(parentId) : null,
      userId,
      path: parentId ? `${parentId}/${name}` : `/${name}`
    })
    
    if (!folder) {
      return res.status(500).json({ message: '创建文件夹失败' })
    }
    
    res.status(201).json(folder)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '创建文件夹失败' })
  }
})

// Create or update file
router.post('/file', authenticateToken, async (req, res) => {
  try {
    const { name, content, parentId = null, fileId } = req.body
    const userId = req.user.id
    
    if (fileId) {
      // Update existing file
      const existingFile = await getFileById(parseInt(fileId))
      if (!existingFile || existingFile.user_id !== userId) {
        return res.status(404).json({ message: '文件不存在' })
      }
      
      // If this is an uploaded markdown file, update both database and file system
      if (existingFile.is_uploaded && existingFile.file_path && (existingFile.type === '.md' || existingFile.name.toLowerCase().endsWith('.md'))) {
        try {
          const filePath = path.resolve(existingFile.file_path)
          await fs.writeFile(filePath, content, 'utf8')
        } catch (writeError) {
          console.error('写入上传的markdown文件失败:', writeError)
          // Continue to update database even if file write fails
        }
      }
      
      const updatedFile = await updateFile(parseInt(fileId), { 
        content,
        size: Buffer.byteLength(content || '', 'utf8')
      })
      if (!updatedFile) {
        return res.status(500).json({ message: '更新文件失败' })
      }
      res.json(updatedFile)
    } else {
      // Create new file
      if (!name) {
        return res.status(400).json({ message: '文件名不能为空' })
      }
      
      const file = await createFile({
        name,
        content: content || '',
        parentId: parentId ? parseInt(parentId) : null,
        userId,
        type: path.extname(name).toLowerCase() || '.md',
        size: Buffer.byteLength(content || '', 'utf8')
      })
      
      if (!file) {
        return res.status(500).json({ message: '创建文件失败' })
      }
      
      res.status(201).json(file)
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '保存文件失败' })
  }
})

// Get file content
router.get('/file/:id', authenticateToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id)
    const userId = req.user.id
    
    const file = await getFileById(fileId)
    
    if (!file || file.user_id !== userId) {
      return res.status(404).json({ message: '文件不存在' })
    }
    
    // If this is an uploaded markdown file, read content from file system
    if (file.is_uploaded && file.file_path && (file.type === '.md' || file.name.toLowerCase().endsWith('.md'))) {
      try {
        const filePath = path.resolve(file.file_path)
        if (await fs.pathExists(filePath)) {
          const content = await fs.readFile(filePath, 'utf8')
          file.content = content
        }
      } catch (readError) {
        console.error('读取上传的markdown文件失败:', readError)
        // Fall back to database content if file read fails
      }
    }
    
    res.json(file)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '获取文件失败' })
  }
})

// Delete file
router.delete('/file/:id', authenticateToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id)
    const userId = req.user.id
    
    const file = await getFileById(fileId)
    
    if (!file || file.user_id !== userId) {
      return res.status(404).json({ message: '文件不存在' })
    }
    
    const deleted = await deleteFile(fileId)
    if (!deleted) {
      return res.status(500).json({ message: '删除文件失败' })
    }
    
    res.json({ message: '文件删除成功' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '删除文件失败' })
  }
})

// Delete folder
router.delete('/folder/:id', authenticateToken, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id)
    const userId = req.user.id
    
    const folder = await getFolderById(folderId)
    
    if (!folder || folder.user_id !== userId) {
      return res.status(404).json({ message: '文件夹不存在' })
    }
    
    const deleted = await deleteFolder(folderId)
    if (!deleted) {
      return res.status(500).json({ message: '删除文件夹失败' })
    }
    
    res.json({ message: '文件夹删除成功' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '删除文件夹失败' })
  }
})

// Upload file
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { parentId } = req.body
    const userId = req.user.id
    
    if (!req.file) {
      return res.status(400).json({ message: '没有上传文件' })
    }
    
    // Decode file name to handle Chinese and special characters
    let decodedFileName = req.file.originalname
    try {
      // Try to decode if the filename appears to be encoded
      if (req.file.originalname.includes('%')) {
        decodedFileName = decodeURIComponent(req.file.originalname)
      } else {
        // Try different decoding approaches
        const buffer = Buffer.from(req.file.originalname, 'binary')
        decodedFileName = buffer.toString('utf8')
      }
    } catch (error) {
      console.log('File name decoding failed, using original name:', error)
      decodedFileName = req.file.originalname
    }
    
    const file = await createFile({
      name: decodedFileName,
      parentId: parentId ? parseInt(parentId) : null,
      userId,
      type: path.extname(decodedFileName).toLowerCase(),
      size: req.file.size,
      filePath: req.file.path,
      isUploaded: true
    })
    
    if (!file) {
      return res.status(500).json({ message: '保存文件信息失败' })
    }
    
    res.status(201).json(file)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '上传文件失败' })
  }
})

// Download file
router.get('/download/:id', authenticateToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id)
    const userId = req.user.id
    
    console.log(`下载文件请求: 文件ID=${fileId}, 用户ID=${userId}`)
    
    const file = await getFileById(fileId)
    
    if (!file) {
      console.log(`文件不存在: ID=${fileId}`)
      return res.status(404).json({ message: '文件不存在' })
    }
    
    if (file.user_id !== userId) {
      console.log(`权限不足: 文件属于用户${file.user_id}, 请求用户${userId}`)
      return res.status(403).json({ message: '无权限访问此文件' })
    }
    
    if (file.is_uploaded && file.file_path) {
      // Download uploaded file
      const filePath = path.resolve(file.file_path)
      if (await fs.pathExists(filePath)) {
        // Properly encode filename for download
        const safeFileName = file.name.replace(/[^\w\-_.]/g, '_')
        const encodedFileName = encodeURIComponent(file.name)
        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`)
        res.download(filePath, file.name)
      } else {
        res.status(404).json({ message: '文件不存在' })
      }
    } else {
      // Download text file
      const safeFileName = file.name.replace(/[^\w\-_.]/g, '_')
      const encodedFileName = encodeURIComponent(file.name)
      res.setHeader('Content-Type', 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`)
      res.send(file.content || '')
    }
  } catch (error) {
    console.error('下载文件失败:', error)
    res.status(500).json({ 
      message: '下载文件失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Rename file
router.put('/file/:id/rename', authenticateToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id)
    const { name } = req.body
    const userId = req.user.id
    
    if (!name) {
      return res.status(400).json({ message: '文件名不能为空' })
    }
    
    const file = await getFileById(fileId)
    
    if (!file || file.user_id !== userId) {
      return res.status(404).json({ message: '文件不存在' })
    }
    
    const renamedFile = await renameFile(fileId, name)
    if (!renamedFile) {
      return res.status(500).json({ message: '重命名失败' })
    }
    
    res.json(renamedFile)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '重命名文件失败' })
  }
})

// Rename folder
router.put('/folder/:id/rename', authenticateToken, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id)
    const { name } = req.body
    const userId = req.user.id
    
    if (!name) {
      return res.status(400).json({ message: '文件夹名称不能为空' })
    }
    
    const folder = await getFolderById(folderId)
    
    if (!folder || folder.user_id !== userId) {
      return res.status(404).json({ message: '文件夹不存在' })
    }
    
    const renamedFolder = await renameFolder(folderId, name)
    if (!renamedFolder) {
      return res.status(500).json({ message: '重命名失败' })
    }
    
    res.json(renamedFolder)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '重命名文件夹失败' })
  }
})

// Move file
router.put('/file/:id/move', authenticateToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id)
    const { parentId } = req.body
    const userId = req.user.id
    
    const file = await getFileById(fileId)
    
    if (!file || file.user_id !== userId) {
      return res.status(404).json({ message: '文件不存在' })
    }
    
    // 检查是否移动到相同位置
    const currentParentId = file.parent_id
    const newParentId = parentId ? parseInt(parentId) : null
    if (currentParentId === newParentId) {
      return res.status(400).json({ message: '文件已在此位置' })
    }
    
    const movedFile = await moveFile(fileId, parentId ? parseInt(parentId) : null)
    if (!movedFile) {
      return res.status(500).json({ message: '移动失败' })
    }
    
    res.json(movedFile)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '移动文件失败' })
  }
})

// Move folder
router.put('/folder/:id/move', authenticateToken, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id)
    const { parentId } = req.body
    const userId = req.user.id
    
    const folder = await getFolderById(folderId)
    
    if (!folder || folder.user_id !== userId) {
      return res.status(404).json({ message: '文件夹不存在' })
    }
    
    // 防止将文件夹移动到自己的子文件夹中
    if (parentId) {
      const targetParent = await getFolderById(parseInt(parentId))
      if (targetParent && targetParent.path.startsWith(folder.path)) {
        return res.status(400).json({ message: '不能将文件夹移动到自己的子文件夹中' })
      }
    }
    
    // 检查是否移动到相同位置
    const currentParentId = folder.parent_id
    const newParentId = parentId ? parseInt(parentId) : null
    if (currentParentId === newParentId) {
      return res.status(400).json({ message: '文件夹已在此位置' })
    }
    
    const movedFolder = await moveFolder(folderId, parentId ? parseInt(parentId) : null)
    if (!movedFolder) {
      return res.status(500).json({ message: '移动失败' })
    }
    
    res.json(movedFolder)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '移动文件夹失败' })
  }
})

// Download all user data as ZIP
router.get('/download-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    
    // Get user's files and folders
    const userFiles = await getAllFilesByUser(userId)
    const userFolders = await getAllFoldersByUser(userId)
    
    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="cloud-note-backup-${new Date().toISOString().split('T')[0]}.zip"`)
    
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    })
    
    // Pipe archive to response
    archive.pipe(res)
    
    // Add user info file
    archive.append(JSON.stringify({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.created_at
      },
      exportDate: new Date().toISOString(),
      totalFiles: userFiles.length,
      totalFolders: userFolders.length
    }, null, 2), { name: 'user-info.json' })
    
    // Create folder structure map for organizing files
    const folderMap = new Map()
    userFolders.forEach(folder => {
      folderMap.set(folder.id, folder)
    })
    
    // Function to get folder path
    const getFolderPath = (folderId) => {
      if (!folderId || folderId === 1) return '' // root folder
      const folder = folderMap.get(folderId)
      if (!folder) return ''
      
      const parentPath = getFolderPath(folder.parent_id)
      return parentPath ? `${parentPath}/${folder.name}` : folder.name
    }
    
    // Add all user files to archive
    userFiles.forEach(file => {
      const folderPath = getFolderPath(file.parent_id)
      const filePath = folderPath ? `${folderPath}/${file.name}` : file.name
      
      // Add file content
      archive.append(file.content || '', { name: filePath })
      
      // Add file metadata
      archive.append(JSON.stringify({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        parentId: file.parent_id,
        createdAt: file.created_at,
        updatedAt: file.updated_at
      }, null, 2), { name: `${filePath}.meta.json` })
    })
    
    // Add folder structure info
    archive.append(JSON.stringify(userFolders, null, 2), { name: 'folder-structure.json' })
    
    // Finalize archive
    archive.finalize()
    
  } catch (error) {
    console.error('Download error:', error)
    res.status(500).json({ message: '下载失败' })
  }
})

export default router