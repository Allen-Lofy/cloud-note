import { initDatabase } from '../utils/mysql.js'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  try {
    console.log('开始初始化数据库...')
    await initDatabase()
    console.log('数据库初始化完成！')
    process.exit(0)
  } catch (error) {
    console.error('数据库初始化失败:', error.message)
    console.log('\n请检查：')
    console.log('1. MySQL 服务是否正在运行')
    console.log('2. .env 文件中的数据库配置是否正确')
    console.log('3. MySQL 用户权限是否足够')
    process.exit(1)
  }
}

main()