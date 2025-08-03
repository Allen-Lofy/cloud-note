import express from 'express'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import { getAllUsers, getUserCount, getFileCount, getFolderCount } from '../utils/mysql-db.js'
import { query } from '../utils/mysql.js'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs-extra'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Get all users
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await getAllUsers()
    res.json(users)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '获取用户列表失败' })
  }
})

// Get system stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await getUserCount()
    const totalFiles = await getFileCount()
    const totalFolders = await getFolderCount()
    
    // 获取管理员和普通用户数量
    const adminUsersResult = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin'])
    const regularUsersResult = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['user'])
    
    const stats = {
      totalUsers,
      totalFiles,
      totalFolders,
      adminUsers: adminUsersResult[0].count,
      regularUsers: regularUsersResult[0].count
    }
    
    res.json(stats)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '获取系统统计失败' })
  }
})

// Delete user
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id)
    
    if (userId === req.user.id) {
      return res.status(400).json({ message: '不能删除自己的账户' })
    }
    
    // 检查用户是否存在
    const userResult = await query('SELECT * FROM users WHERE id = ?', [userId])
    
    if (userResult.length === 0) {
      return res.status(404).json({ message: '用户不存在' })
    }
    
    // 删除用户及其相关数据（由于外键约束，文件和文件夹会自动删除）
    await query('DELETE FROM users WHERE id = ?', [userId])
    
    res.json({ message: '用户删除成功' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '删除用户失败' })
  }
})

// Download database backup (SQL format)
router.get('/backup', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('开始创建SQL备份...')
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `cloudnote_backup_${timestamp}.sql`
    
    // 获取数据库配置
    const dbHost = process.env.DB_HOST || 'localhost'
    const dbPort = process.env.DB_PORT || '3306'
    const dbUser = process.env.DB_USER || 'root'
    const dbPassword = process.env.DB_PASSWORD || ''
    const dbName = process.env.DB_NAME || 'cloudnote'
    
    console.log(`数据库配置: ${dbHost}:${dbPort}, 用户: ${dbUser}, 数据库: ${dbName}`)
    
    // 构建 mysqldump 命令（强制使用TCP连接）
    const mysqldumpArgs = [
      '-h', '127.0.0.1',  // 强制使用TCP而不是socket
      '-P', dbPort,
      '-u', dbUser,
      '--protocol=TCP',   // 明确指定使用TCP协议
      '--single-transaction',
      '--default-character-set=utf8mb4',
      dbName
    ]
    
    // 如果有密码，添加密码参数（插入到数据库名之前）
    if (dbPassword) {
      mysqldumpArgs.splice(-1, 0, `-p${dbPassword}`)
    }
    
    console.log('执行mysqldump命令:', mysqldumpArgs.join(' '))
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/sql')
    res.setHeader('Content-Disposition', `attachment; filename="${backupFileName}"`)
    
    // 执行 mysqldump
    const mysqldump = spawn('mysqldump', mysqldumpArgs)
    
    let output = ''
    let errorOutput = ''
    
    mysqldump.stdout.on('data', (data) => {
      output += data.toString()
      console.log('mysqldump stdout data received:', data.length, 'bytes')
    })
    
    mysqldump.stderr.on('data', (data) => {
      errorOutput += data.toString()
      console.error('mysqldump stderr:', data.toString())
    })
    
    mysqldump.on('close', (code) => {
      console.log(`mysqldump 进程退出，代码: ${code}`)
      console.log(`输出长度: ${output.length} 字节`)
      console.log(`错误输出: ${errorOutput}`)
      
      if (code === 0 && output.length > 0) {
        // 成功输出SQL内容
        res.send(output)
      } else {
        console.error('mysqldump 错误输出:', errorOutput)
        if (!res.headersSent) {
          res.status(500).json({ 
            message: '数据库备份失败', 
            error: errorOutput || `进程退出代码: ${code}, 输出长度: ${output.length}`
          })
        }
      }
    })
    
    mysqldump.on('error', (error) => {
      console.error('mysqldump 进程错误:', error)
      if (!res.headersSent) {
        res.status(500).json({ 
          message: '数据库备份失败', 
          error: 'mysqldump 命令不可用，请确保 MySQL 客户端工具已安装并在 PATH 中' 
        })
      }
    })
    
  } catch (error) {
    console.error('创建数据库备份失败:', error)
    if (!res.headersSent) {
      res.status(500).json({ message: '创建数据库备份失败', error: error.message })
    }
  }
})

// Alternative backup method: Export as JSON
router.get('/backup-json', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 获取所有数据
    const users = await query('SELECT * FROM users')
    const folders = await query('SELECT * FROM folders')
    const files = await query('SELECT * FROM files')
    
    // 构造备份数据
    const backupData = {
      exported_at: new Date().toISOString(),
      version: '1.0',
      database: 'mysql',
      data: {
        users: users.map(user => ({
          ...user,
          password: '[HIDDEN]' // 出于安全考虑，隐藏密码
        })),
        folders,
        files
      }
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `cloudnote_backup_${timestamp}.json`
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.json(backupData)
    
  } catch (error) {
    console.error('创建 JSON 备份失败:', error)
    res.status(500).json({ message: '创建 JSON 备份失败' })
  }
})

export default router