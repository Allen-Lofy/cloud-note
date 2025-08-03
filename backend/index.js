import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs-extra'
import dotenv from 'dotenv'
import { initDatabase } from './utils/mysql.js'

import authRoutes from './routes/auth.js'
import filesRoutes from './routes/files.js'
import adminRoutes from './routes/admin.js'
import pdfRoutes from './routes/pdf.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))

// Static files for uploaded content
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/pdf', pdfRoutes)

// Ensure required directories exist
const ensureDirectories = async () => {
  const dirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'data'),
    path.join(__dirname, 'data/notes')
  ]
  
  for (const dir of dirs) {
    await fs.ensureDir(dir)
  }
}

// Initialize MySQL database
const initializeDB = async () => {
  try {
    await initDatabase()
    console.log('MySQL 数据库初始化完成')
  } catch (error) {
    console.error('MySQL 数据库初始化失败:', error)
    throw error
  }
}

// Start server
const startServer = async () => {
  try {
    await ensureDirectories()
    await initializeDB()
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()