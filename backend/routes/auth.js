import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { findUser, createUser, updateUser } from '../utils/mysql-db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    // Check if user already exists
    const existingUser = await findUser({ username }) || await findUser({ email })
    if (existingUser) {
      return res.status(400).json({ message: '用户名或邮箱已存在' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await createUser({
      username,
      email,
      password: hashedPassword
    })

    if (!user) {
      return res.status(500).json({ message: '创建用户失败' })
    }

    // Generate token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    res.status(201).json({
      message: '注册成功',
      user: userWithoutPassword,
      token
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    // Find user by username or email
    const user = await findUser({ username }) || await findUser({ email: username })
    if (!user) {
      return res.status(400).json({ message: '用户名或密码错误' })
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(400).json({ message: '用户名或密码错误' })
    }

    // Generate token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    res.json({
      message: '登录成功',
      user: userWithoutPassword,
      token
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user
  res.json(userWithoutPassword)
})

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '请提供当前密码和新密码' })
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密码长度不能少于6位' })
    }
    
    // Verify current password
    const user = await findUser({ id: req.user.id })
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }
    
    const validPassword = await bcrypt.compare(currentPassword, user.password)
    if (!validPassword) {
      return res.status(400).json({ message: '当前密码错误' })
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)
    
    // Update user password
    const updatedUser = await updateUser(req.user.id, { 
      password: hashedNewPassword 
    })
    
    if (!updatedUser) {
      return res.status(500).json({ message: '修改密码失败' })
    }
    
    res.json({ 
      message: '密码修改成功',
      user: updatedUser
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '服务器错误' })
  }
})

export default router