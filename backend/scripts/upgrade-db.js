import { initDatabase, query } from '../utils/mysql.js'

async function upgradeDatabase() {
  try {
    console.log('开始升级数据库结构...')
    
    // 初始化数据库连接
    await initDatabase()
    
    // 检查 file_path 字段是否存在
    try {
      const columns = await query('SHOW COLUMNS FROM files LIKE "file_path"')
      if (columns.length === 0) {
        console.log('添加 file_path 字段...')
        await query('ALTER TABLE files ADD COLUMN file_path VARCHAR(500) NULL')
        console.log('✅ file_path 字段添加成功')
      } else {
        console.log('✅ file_path 字段已存在')
      }
    } catch (error) {
      console.error('添加 file_path 字段失败:', error)
    }
    
    // 检查 is_uploaded 字段是否存在
    try {
      const columns = await query('SHOW COLUMNS FROM files LIKE "is_uploaded"')
      if (columns.length === 0) {
        console.log('添加 is_uploaded 字段...')
        await query('ALTER TABLE files ADD COLUMN is_uploaded BOOLEAN DEFAULT FALSE')
        console.log('✅ is_uploaded 字段添加成功')
      } else {
        console.log('✅ is_uploaded 字段已存在')
      }
    } catch (error) {
      console.error('添加 is_uploaded 字段失败:', error)
    }
    
    console.log('数据库结构升级完成！')
    
  } catch (error) {
    console.error('数据库升级失败:', error)
    throw error
  }
}

async function main() {
  try {
    await upgradeDatabase()
    console.log('\n✅ 数据库升级成功完成！')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ 数据库升级失败:', error.message)
    process.exit(1)
  }
}

main()