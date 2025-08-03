import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cloudnote',
  charset: 'utf8mb4'
}

// 创建连接池
let pool

// 初始化数据库连接
export const initDatabase = async () => {
  try {
    // 首先连接到 MySQL 服务器（不指定数据库）
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    })

    // 检查数据库是否存在，如果不存在则创建
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    console.log(`数据库 '${dbConfig.database}' 已创建或已存在`)

    await tempConnection.end()

    // 创建连接池
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    })

    // 执行表结构创建
    await createTables()
    
    console.log('数据库连接池已创建并初始化完成')
    return true
  } catch (error) {
    console.error('数据库初始化失败:', error)
    throw error
  }
}

// 创建表结构
const createTables = async () => {
  try {
    const schemaPath = path.join(__dirname, '../sql/schema.sql')
    const schema = await fs.readFile(schemaPath, 'utf8')
    
    // 更健壮的 SQL 语句解析
    // 移除注释行
    const cleanSchema = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
    
    // 按分号分割语句
    const statements = cleanSchema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => {
        const line = stmt.toLowerCase()
        return stmt.length > 0 && 
               !line.includes('create database') && 
               !line.includes('use cloudnote') &&
               stmt.trim() !== ''
      })

    console.log('所有语句:')
    statements.forEach((stmt, index) => {
      console.log(`${index + 1}: ${stmt.substring(0, 80)}...`)
    })

    // 分类执行：先执行表创建，再执行其他语句
    const createTableStatements = statements.filter(stmt => 
      stmt.toLowerCase().includes('create table')
    )
    const insertStatements = statements.filter(stmt => 
      stmt.toLowerCase().includes('insert')
    )
    const alterStatements = statements.filter(stmt => 
      stmt.toLowerCase().includes('alter table')
    )

    console.log(`找到 ${createTableStatements.length} 个表创建语句`)
    console.log(`找到 ${insertStatements.length} 个插入语句`)
    console.log(`找到 ${alterStatements.length} 个修改语句`)

    // 按顺序执行
    for (const statement of createTableStatements) {
      console.log('执行表创建:', statement.substring(0, 50) + '...')
      await pool.execute(statement)
      console.log('表创建完成')
    }

    for (const statement of insertStatements) {
      console.log('执行插入:', statement.substring(0, 50) + '...')
      await pool.execute(statement)
      console.log('初始数据插入完成')
    }

    for (const statement of alterStatements) {
      console.log('执行修改:', statement.substring(0, 50) + '...')
      await pool.execute(statement)
      console.log('表结构调整完成')
    }
    
    console.log('数据库表结构已创建')
  } catch (error) {
    console.error('创建表结构失败:', error)
    throw error
  }
}

// 获取数据库连接
export const getConnection = () => {
  if (!pool) {
    throw new Error('数据库连接池未初始化，请先调用 initDatabase()')
  }
  return pool
}

// 执行查询
export const query = async (sql, params = []) => {
  try {
    const connection = getConnection()
    const [rows] = await connection.execute(sql, params)
    return rows
  } catch (error) {
    console.error('数据库查询失败:', error)
    throw error
  }
}

// 执行事务
export const transaction = async (callback) => {
  const connection = await getConnection().getConnection()
  
  try {
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// 关闭数据库连接
export const closeDatabase = async () => {
  if (pool) {
    await pool.end()
    console.log('数据库连接池已关闭')
  }
}