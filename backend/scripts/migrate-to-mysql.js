import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase, query } from '../utils/mysql.js'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// JSON 数据库路径
const JSON_DB_PATH = path.join(__dirname, '../data/db.json')

// 迁移函数
async function migrateData() {
  try {
    // 检查 JSON 数据库文件是否存在
    if (!await fs.pathExists(JSON_DB_PATH)) {
      console.log('JSON 数据库文件不存在，无需迁移')
      return
    }

    console.log('开始数据迁移...')
    
    // 初始化 MySQL 数据库
    await initDatabase()
    
    // 读取 JSON 数据
    const jsonData = await fs.readJson(JSON_DB_PATH)
    console.log(`发现 ${jsonData.users.length} 个用户，${jsonData.files.length} 个文件，${jsonData.folders.length} 个文件夹`)
    
    // 清空现有数据（如果需要的话）
    console.log('清空现有数据...')
    await query('DELETE FROM files')
    await query('DELETE FROM folders WHERE id != 1') // 保留 root 文件夹
    await query('DELETE FROM users')
    
    // 重置自增ID
    await query('ALTER TABLE users AUTO_INCREMENT = 1')
    await query('ALTER TABLE folders AUTO_INCREMENT = 2')
    await query('ALTER TABLE files AUTO_INCREMENT = 1')
    
    // 迁移用户数据
    console.log('迁移用户数据...')
    const userIdMapping = {} // 用于记录 JSON ID 到 MySQL ID 的映射
    
    for (const user of jsonData.users) {
      try {
        const sql = `
          INSERT INTO users (username, email, password, role, created_at)
          VALUES (?, ?, ?, ?, ?)
        `
        const createdAt = user.createdAt ? new Date(user.createdAt) : new Date()
        
        const result = await query(sql, [
          user.username,
          user.email,
          user.password, // 密码已经是哈希过的
          user.role || 'user',
          createdAt
        ])
        
        userIdMapping[user.id] = result.insertId
        console.log(`迁移用户: ${user.username} (${user.id} -> ${result.insertId})`)
      } catch (error) {
        console.error(`迁移用户失败 ${user.username}:`, error.message)
      }
    }
    
    // 迁移文件夹数据
    console.log('迁移文件夹数据...')
    const folderIdMapping = { null: null, 1: 1 } // root 文件夹已存在
    
    // 按层级顺序迁移文件夹（先迁移父级，再迁移子级）
    const sortedFolders = jsonData.folders
      .filter(f => f.id !== 1) // 排除 root 文件夹
      .sort((a, b) => {
        // 先按父级排序，再按 ID 排序
        if (a.parentId === null && b.parentId !== null) return -1
        if (a.parentId !== null && b.parentId === null) return 1
        return a.id - b.id
      })
    
    for (const folder of sortedFolders) {
      try {
        const sql = `
          INSERT INTO folders (name, parent_id, user_id, path, created_at)
          VALUES (?, ?, ?, ?, ?)
        `
        const parentId = folderIdMapping[folder.parentId] || null
        const userId = folder.userId ? userIdMapping[folder.userId] : null
        const createdAt = folder.createdAt ? new Date(folder.createdAt) : new Date()
        
        const result = await query(sql, [
          folder.name,
          parentId,
          userId,
          folder.path,
          createdAt
        ])
        
        folderIdMapping[folder.id] = result.insertId
        console.log(`迁移文件夹: ${folder.name} (${folder.id} -> ${result.insertId})`)
      } catch (error) {
        console.error(`迁移文件夹失败 ${folder.name}:`, error.message)
      }
    }
    
    // 迁移文件数据
    console.log('迁移文件数据...')
    for (const file of jsonData.files) {
      try {
        const sql = `
          INSERT INTO files (name, content, parent_id, user_id, type, size, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
        const parentId = folderIdMapping[file.parentId]
        const userId = userIdMapping[file.userId]
        const createdAt = file.createdAt ? new Date(file.createdAt) : new Date()
        const updatedAt = file.updatedAt ? new Date(file.updatedAt) : createdAt
        
        if (!parentId || !userId) {
          console.warn(`跳过文件 ${file.name}: 无效的父文件夹或用户ID`)
          continue
        }
        
        await query(sql, [
          file.name,
          file.content || '',
          parentId,
          userId,
          file.type || '.md',
          file.size || 0,
          createdAt,
          updatedAt
        ])
        
        console.log(`迁移文件: ${file.name}`)
      } catch (error) {
        console.error(`迁移文件失败 ${file.name}:`, error.message)
      }
    }
    
    // 创建默认管理员用户（如果不存在）
    const adminExists = await query('SELECT * FROM users WHERE username = ? OR role = ?', ['admin', 'admin'])
    if (adminExists.length === 0) {
      console.log('创建默认管理员用户...')
      const hashedPassword = await bcrypt.hash('password', 10)
      await query(`
        INSERT INTO users (username, email, password, role, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `, ['admin', 'admin@example.com', hashedPassword, 'admin'])
      console.log('默认管理员用户创建完成 (用户名: admin, 密码: password)')
    }
    
    // 备份原始 JSON 文件
    const backupPath = `${JSON_DB_PATH}.backup.${Date.now()}`
    await fs.copy(JSON_DB_PATH, backupPath)
    console.log(`原始 JSON 数据已备份到: ${backupPath}`)
    
    console.log('数据迁移完成！')
    console.log('\n迁移统计:')
    
    const userCount = await query('SELECT COUNT(*) as count FROM users')
    const folderCount = await query('SELECT COUNT(*) as count FROM folders')
    const fileCount = await query('SELECT COUNT(*) as count FROM files')
    
    console.log(`- 用户: ${userCount[0].count}`)
    console.log(`- 文件夹: ${folderCount[0].count}`)
    console.log(`- 文件: ${fileCount[0].count}`)
    
  } catch (error) {
    console.error('数据迁移失败:', error)
    throw error
  }
}

// 运行迁移
async function main() {
  try {
    await migrateData()
    console.log('\n✅ 数据迁移成功完成！')
    console.log('现在可以启动服务器使用 MySQL 数据库了。')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ 数据迁移失败:', error.message)
    console.log('\n请检查：')
    console.log('1. MySQL 服务是否正在运行')
    console.log('2. .env 文件中的数据库配置是否正确')
    console.log('3. MySQL 用户是否有足够的权限')
    process.exit(1)
  }
}

main()