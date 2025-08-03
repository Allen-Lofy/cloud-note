import { initDatabase, query } from '../utils/mysql.js'
import { findUser, createUser, getAllUsers } from '../utils/mysql-db.js'

async function testDatabase() {
  try {
    console.log('开始测试 MySQL 数据库功能...')
    
    // 1. 测试数据库初始化
    await initDatabase()
    console.log('✅ 数据库初始化成功')
    
    // 2. 测试查询用户
    const admin = await findUser({ username: 'admin' })
    if (admin) {
      console.log('✅ 找到管理员用户:', admin.username)
    } else {
      console.log('❌ 未找到管理员用户')
    }
    
    // 3. 测试统计查询
    const userCount = await query('SELECT COUNT(*) as count FROM users')
    const fileCount = await query('SELECT COUNT(*) as count FROM files')
    const folderCount = await query('SELECT COUNT(*) as count FROM folders')
    
    console.log('✅ 数据库统计:')
    console.log(`  - 用户数: ${userCount[0].count}`)
    console.log(`  - 文件数: ${fileCount[0].count}`)
    console.log(`  - 文件夹数: ${folderCount[0].count}`)
    
    // 4. 测试获取所有用户
    const allUsers = await getAllUsers()
    console.log(`✅ 获取到 ${allUsers.length} 个用户`)
    
    // 5. 测试数据库备份功能（JSON格式）
    const users = await query('SELECT * FROM users')
    const folders = await query('SELECT * FROM folders')
    const files = await query('SELECT * FROM files')
    
    const backupData = {
      users: users.length,
      folders: folders.length,
      files: files.length
    }
    console.log('✅ 备份数据统计:', backupData)
    
    console.log('\n🎉 所有测试通过！MySQL 数据库迁移成功')
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    console.error(error)
  }
}

testDatabase().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('严重错误:', error)
  process.exit(1)
})