import { query, transaction } from './mysql.js'

// 用户相关操作
export const findUser = async (criteria) => {
  try {
    const keys = Object.keys(criteria)
    const values = Object.values(criteria)
    const whereClause = keys.map(key => `${key} = ?`).join(' AND ')
    
    const sql = `SELECT * FROM users WHERE ${whereClause}`
    const users = await query(sql, values)
    
    return users.length > 0 ? users[0] : null
  } catch (error) {
    console.error('查找用户失败:', error)
    return null
  }
}

export const createUser = async (userData) => {
  try {
    const { username, email, password, role = 'user' } = userData
    
    const sql = `
      INSERT INTO users (username, email, password, role, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `
    
    const result = await query(sql, [username, email, password, role])
    
    // 获取新创建的用户
    const newUser = await query('SELECT * FROM users WHERE id = ?', [result.insertId])
    return newUser[0]
  } catch (error) {
    console.error('创建用户失败:', error)
    return null
  }
}

export const updateUser = async (userId, updates) => {
  try {
    const keys = Object.keys(updates)
    const values = Object.values(updates)
    const setClause = keys.map(key => `${key} = ?`).join(', ')
    
    const sql = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = ?`
    await query(sql, [...values, userId])
    
    // 返回更新后的用户（不包含密码）
    const updatedUser = await query('SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?', [userId])
    return updatedUser.length > 0 ? updatedUser[0] : null
  } catch (error) {
    console.error('更新用户失败:', error)
    return null
  }
}

// 文件相关操作
export const findFilesByUser = async (userId, parentId = null) => {
  try {
    const sql = `SELECT * FROM files WHERE user_id = ? AND parent_id = ? ORDER BY name`
    return await query(sql, [userId, parentId])
  } catch (error) {
    console.error('查找用户文件失败:', error)
    return []
  }
}

export const getFileById = async (fileId) => {
  try {
    const files = await query('SELECT * FROM files WHERE id = ?', [fileId])
    return files.length > 0 ? files[0] : null
  } catch (error) {
    console.error('获取文件失败:', error)
    return null
  }
}

export const createFile = async (fileData) => {
  try {
    const { 
      name, 
      content = '', 
      parentId, 
      userId, 
      type = '.md', 
      size = 0, 
      filePath = null, 
      isUploaded = false 
    } = fileData
    
    const sql = `
      INSERT INTO files (name, content, parent_id, user_id, type, size, file_path, is_uploaded, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `
    
    const result = await query(sql, [name, content, parentId, userId, type, size, filePath, isUploaded])
    
    // 获取新创建的文件
    const newFile = await query('SELECT * FROM files WHERE id = ?', [result.insertId])
    return newFile[0]
  } catch (error) {
    console.error('创建文件失败:', error)
    return null
  }
}

export const updateFile = async (fileId, updates) => {
  try {
    const keys = Object.keys(updates)
    const values = Object.values(updates)
    const setClause = keys.map(key => `${key} = ?`).join(', ')
    
    const sql = `UPDATE files SET ${setClause}, updated_at = NOW() WHERE id = ?`
    await query(sql, [...values, fileId])
    
    // 返回更新后的文件
    const updatedFile = await query('SELECT * FROM files WHERE id = ?', [fileId])
    return updatedFile.length > 0 ? updatedFile[0] : null
  } catch (error) {
    console.error('更新文件失败:', error)
    return null
  }
}

export const deleteFile = async (fileId) => {
  try {
    const result = await query('DELETE FROM files WHERE id = ?', [fileId])
    return result.affectedRows > 0
  } catch (error) {
    console.error('删除文件失败:', error)
    return false
  }
}

export const renameFile = async (fileId, newName) => {
  try {
    const sql = `UPDATE files SET name = ?, updated_at = NOW() WHERE id = ?`
    await query(sql, [newName, fileId])
    
    // 返回更新后的文件
    const updatedFile = await query('SELECT * FROM files WHERE id = ?', [fileId])
    return updatedFile.length > 0 ? updatedFile[0] : null
  } catch (error) {
    console.error('重命名文件失败:', error)
    return null
  }
}

export const moveFile = async (fileId, newParentId) => {
  try {
    const sql = `UPDATE files SET parent_id = ?, updated_at = NOW() WHERE id = ?`
    await query(sql, [newParentId, fileId])
    
    // 返回更新后的文件
    const updatedFile = await query('SELECT * FROM files WHERE id = ?', [fileId])
    return updatedFile.length > 0 ? updatedFile[0] : null
  } catch (error) {
    console.error('移动文件失败:', error)
    return null
  }
}

// 文件夹相关操作
export const findFoldersByUser = async (userId, parentId = null) => {
  try {
    const sql = `
      SELECT * FROM folders 
      WHERE (user_id = ? OR user_id IS NULL) AND parent_id ${parentId === null ? 'IS NULL' : '= ?'}
      ORDER BY name
    `
    const params = parentId === null ? [userId] : [userId, parentId]
    return await query(sql, params)
  } catch (error) {
    console.error('查找用户文件夹失败:', error)
    return []
  }
}

export const createFolder = async (folderData) => {
  try {
    const { name, parentId = null, userId, path } = folderData
    
    const sql = `
      INSERT INTO folders (name, parent_id, user_id, path, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `
    
    const result = await query(sql, [name, parentId, userId, path])
    
    // 获取新创建的文件夹
    const newFolder = await query('SELECT * FROM folders WHERE id = ?', [result.insertId])
    return newFolder[0]
  } catch (error) {
    console.error('创建文件夹失败:', error)
    return null
  }
}

export const deleteFolder = async (folderId) => {
  return await transaction(async (connection) => {
    try {
      // 递归删除子文件夹和文件的函数
      const deleteRecursive = async (parentId) => {
        // 删除该文件夹下的所有文件
        await connection.execute('DELETE FROM files WHERE parent_id = ?', [parentId])
        
        // 获取所有子文件夹
        const [subFolders] = await connection.execute('SELECT id FROM folders WHERE parent_id = ?', [parentId])
        
        // 递归删除子文件夹
        for (const folder of subFolders) {
          await deleteRecursive(folder.id)
        }
        
        // 删除子文件夹
        await connection.execute('DELETE FROM folders WHERE parent_id = ?', [parentId])
      }
      
      // 执行递归删除
      await deleteRecursive(folderId)
      
      // 删除目标文件夹
      const [result] = await connection.execute('DELETE FROM folders WHERE id = ?', [folderId])
      
      return result.affectedRows > 0
    } catch (error) {
      console.error('删除文件夹失败:', error)
      throw error
    }
  })
}

export const renameFolder = async (folderId, newName) => {
  try {
    // 获取当前文件夹信息
    const folders = await query('SELECT * FROM folders WHERE id = ?', [folderId])
    if (folders.length === 0) return null
    
    const folder = folders[0]
    const oldPath = folder.path
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/')) || ''
    const newPath = parentPath ? `${parentPath}/${newName}` : `/${newName}`
    
    const sql = `UPDATE folders SET name = ?, path = ?, updated_at = NOW() WHERE id = ?`
    await query(sql, [newName, newPath, folderId])
    
    // 返回更新后的文件夹
    const updatedFolder = await query('SELECT * FROM folders WHERE id = ?', [folderId])
    return updatedFolder.length > 0 ? updatedFolder[0] : null
  } catch (error) {
    console.error('重命名文件夹失败:', error)
    return null
  }
}

export const moveFolder = async (folderId, newParentId) => {
  try {
    // 获取文件夹信息
    const folders = await query('SELECT * FROM folders WHERE id = ?', [folderId])
    if (folders.length === 0) return null
    
    const folder = folders[0]
    
    // 获取新父文件夹信息
    let newPath
    if (newParentId) {
      const parentFolders = await query('SELECT * FROM folders WHERE id = ?', [newParentId])
      if (parentFolders.length === 0) return null
      newPath = `${parentFolders[0].path}/${folder.name}`
    } else {
      newPath = `/${folder.name}`
    }
    
    const sql = `UPDATE folders SET parent_id = ?, path = ?, updated_at = NOW() WHERE id = ?`
    await query(sql, [newParentId, newPath, folderId])
    
    // 返回更新后的文件夹
    const updatedFolder = await query('SELECT * FROM folders WHERE id = ?', [folderId])
    return updatedFolder.length > 0 ? updatedFolder[0] : null
  } catch (error) {
    console.error('移动文件夹失败:', error)
    return null
  }
}

// 统计相关操作（用于管理员功能）
export const getUserCount = async () => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM users')
    return result[0].count
  } catch (error) {
    console.error('获取用户数量失败:', error)
    return 0
  }
}

export const getFileCount = async () => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM files')
    return result[0].count
  } catch (error) {
    console.error('获取文件数量失败:', error)
    return 0
  }
}

export const getFolderCount = async () => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM folders WHERE id != 1') // 排除root文件夹
    return result[0].count
  } catch (error) {
    console.error('获取文件夹数量失败:', error)
    return 0
  }
}

export const getAllUsers = async () => {
  try {
    return await query('SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY created_at DESC')
  } catch (error) {
    console.error('获取所有用户失败:', error)
    return []
  }
}

export const getFolderById = async (folderId) => {
  try {
    const folders = await query('SELECT * FROM folders WHERE id = ?', [folderId])
    return folders.length > 0 ? folders[0] : null
  } catch (error) {
    console.error('获取文件夹失败:', error)
    return null
  }
}

export const getAllFilesByUser = async (userId) => {
  try {
    return await query('SELECT * FROM files WHERE user_id = ? ORDER BY name', [userId])
  } catch (error) {
    console.error('获取用户所有文件失败:', error)
    return []
  }
}

export const getAllFoldersByUser = async (userId) => {
  try {
    return await query('SELECT * FROM folders WHERE user_id = ? ORDER BY name', [userId])
  } catch (error) {
    console.error('获取用户所有文件夹失败:', error)
    return []
  }
}