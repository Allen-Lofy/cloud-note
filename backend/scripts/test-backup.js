import { spawn } from 'child_process'
import dotenv from 'dotenv'

dotenv.config()

async function testMysqldump() {
  try {
    console.log('测试mysqldump命令...')
    
    // 获取数据库配置
    const dbHost = process.env.DB_HOST || 'localhost'
    const dbPort = process.env.DB_PORT || '3306'
    const dbUser = process.env.DB_USER || 'root'
    const dbPassword = process.env.DB_PASSWORD || ''
    const dbName = process.env.DB_NAME || 'cloudnote'
    
    console.log(`数据库配置: ${dbHost}:${dbPort}, 用户: ${dbUser}, 数据库: ${dbName}`)
    
    // 构建 mysqldump 命令
    const mysqldumpArgs = [
      '-h', dbHost,
      '-P', dbPort,
      '-u', dbUser,
      '--single-transaction',
      '--add-drop-table',
      '--complete-insert',
      '--default-character-set=utf8mb4'
    ]
    
    // 如果有密码，添加密码参数
    if (dbPassword) {
      mysqldumpArgs.push(`--password=${dbPassword}`)
    }
    
    // 添加数据库名
    mysqldumpArgs.push(dbName)
    
    console.log('执行命令:', 'mysqldump', mysqldumpArgs.join(' '))
    
    const mysqldump = spawn('mysqldump', mysqldumpArgs)
    
    let output = ''
    let errorOutput = ''
    
    mysqldump.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    mysqldump.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })
    
    mysqldump.on('close', (code) => {
      console.log(`进程退出代码: ${code}`)
      
      if (code === 0) {
        console.log('✅ mysqldump 执行成功')
        console.log('输出长度:', output.length, '字符')
        console.log('输出预览:', output.substring(0, 200) + '...')
      } else {
        console.log('❌ mysqldump 执行失败')
        console.log('错误输出:', errorOutput)
      }
    })
    
    mysqldump.on('error', (error) => {
      console.error('❌ mysqldump 进程错误:', error.message)
    })
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

testMysqldump()