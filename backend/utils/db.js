import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '../data/db.json')

export const readDB = async () => {
  try {
    return await fs.readJson(DB_PATH)
  } catch (error) {
    console.error('Error reading database:', error)
    return null
  }
}

export const writeDB = async (data) => {
  try {
    await fs.writeJson(DB_PATH, data, { spaces: 2 })
    return true
  } catch (error) {
    console.error('Error writing database:', error)
    return false
  }
}

export const findUser = async (criteria) => {
  const db = await readDB()
  if (!db) return null
  
  return db.users.find(user => {
    return Object.keys(criteria).every(key => 
      user[key] === criteria[key]
    )
  })
}

export const createUser = async (userData) => {
  const db = await readDB()
  if (!db) return null
  
  const newUser = {
    id: Math.max(...db.users.map(u => u.id), 0) + 1,
    ...userData,
    role: userData.role || 'user',
    createdAt: new Date().toISOString()
  }
  
  db.users.push(newUser)
  await writeDB(db)
  
  return newUser
}

export const findFilesByUser = async (userId, parentId = null) => {
  const db = await readDB()
  if (!db) return []
  
  return db.files.filter(file => 
    file.userId === userId && file.parentId === parentId
  )
}

export const getFileById = async (fileId) => {
  const db = await readDB()
  if (!db) return null
  
  return db.files.find(file => file.id === fileId)
}

export const findFoldersByUser = async (userId, parentId = null) => {
  const db = await readDB()
  if (!db) return []
  
  return db.folders.filter(folder => 
    (folder.userId === userId || folder.userId === null) && 
    folder.parentId === parentId
  )
}

export const createFolder = async (folderData) => {
  const db = await readDB()
  if (!db) return null
  
  const newFolder = {
    id: Math.max(...db.folders.map(f => f.id), 0) + 1,
    ...folderData,
    createdAt: new Date().toISOString()
  }
  
  db.folders.push(newFolder)
  await writeDB(db)
  
  return newFolder
}

export const createFile = async (fileData) => {
  const db = await readDB()
  if (!db) return null
  
  const newFile = {
    id: Math.max(...db.files.map(f => f.id), 0) + 1,
    ...fileData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  db.files.push(newFile)
  await writeDB(db)
  
  return newFile
}

export const updateFile = async (fileId, updates) => {
  const db = await readDB()
  if (!db) return null
  
  const fileIndex = db.files.findIndex(f => f.id === fileId)
  if (fileIndex === -1) return null
  
  db.files[fileIndex] = {
    ...db.files[fileIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  }
  
  await writeDB(db)
  return db.files[fileIndex]
}

export const deleteFile = async (fileId) => {
  const db = await readDB()
  if (!db) return false
  
  const fileIndex = db.files.findIndex(f => f.id === fileId)
  if (fileIndex === -1) return false
  
  db.files.splice(fileIndex, 1)
  await writeDB(db)
  
  return true
}

export const deleteFolder = async (folderId) => {
  const db = await readDB()
  if (!db) return false
  
  const folderIndex = db.folders.findIndex(f => f.id === folderId)
  if (folderIndex === -1) return false
  
  // Also delete all files and subfolders
  const deleteRecursive = async (parentId) => {
    const subFolders = db.folders.filter(f => f.parentId === parentId)
    const files = db.files.filter(f => f.parentId === parentId)
    
    for (const file of files) {
      const fileIndex = db.files.findIndex(f => f.id === file.id)
      if (fileIndex !== -1) {
        db.files.splice(fileIndex, 1)
      }
    }
    
    for (const folder of subFolders) {
      await deleteRecursive(folder.id)
      const subFolderIndex = db.folders.findIndex(f => f.id === folder.id)
      if (subFolderIndex !== -1) {
        db.folders.splice(subFolderIndex, 1)
      }
    }
  }
  
  await deleteRecursive(folderId)
  db.folders.splice(folderIndex, 1)
  await writeDB(db)
  
  return true
}

export const renameFile = async (fileId, newName) => {
  const db = await readDB()
  if (!db) return null
  
  const fileIndex = db.files.findIndex(f => f.id === fileId)
  if (fileIndex === -1) return null
  
  db.files[fileIndex] = {
    ...db.files[fileIndex],
    name: newName,
    updatedAt: new Date().toISOString()
  }
  
  await writeDB(db)
  return db.files[fileIndex]
}

export const renameFolder = async (folderId, newName) => {
  const db = await readDB()
  if (!db) return null
  
  const folderIndex = db.folders.findIndex(f => f.id === folderId)
  if (folderIndex === -1) return null
  
  const oldPath = db.folders[folderIndex].path
  const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/')) || ''
  const newPath = parentPath ? `${parentPath}/${newName}` : `/${newName}`
  
  db.folders[folderIndex] = {
    ...db.folders[folderIndex],
    name: newName,
    path: newPath,
    updatedAt: new Date().toISOString()
  }
  
  await writeDB(db)
  return db.folders[folderIndex]
}

export const moveFile = async (fileId, newParentId) => {
  const db = await readDB()
  if (!db) return null
  
  const fileIndex = db.files.findIndex(f => f.id === fileId)
  if (fileIndex === -1) return null
  
  db.files[fileIndex] = {
    ...db.files[fileIndex],
    parentId: newParentId,
    updatedAt: new Date().toISOString()
  }
  
  await writeDB(db)
  return db.files[fileIndex]
}

export const moveFolder = async (folderId, newParentId) => {
  const db = await readDB()
  if (!db) return null
  
  const folderIndex = db.folders.findIndex(f => f.id === folderId)
  if (folderIndex === -1) return null
  
  // 更新路径
  const folder = db.folders[folderIndex]
  const newParent = newParentId ? db.folders.find(f => f.id === newParentId) : null
  const newPath = newParent ? `${newParent.path}/${folder.name}` : `/${folder.name}`
  
  db.folders[folderIndex] = {
    ...db.folders[folderIndex],
    parentId: newParentId,
    path: newPath,
    updatedAt: new Date().toISOString()
  }
  
  await writeDB(db)
  return db.folders[folderIndex]
}

export const updateUser = async (userId, updates) => {
  const db = await readDB()
  if (!db) return null
  
  const userIndex = db.users.findIndex(u => u.id === userId)
  if (userIndex === -1) return null
  
  db.users[userIndex] = {
    ...db.users[userIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  }
  
  await writeDB(db)
  const { password: _, ...userWithoutPassword } = db.users[userIndex]
  return userWithoutPassword
}