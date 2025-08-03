import jwt from 'jsonwebtoken'
import { findUser } from '../utils/mysql-db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await findUser({ id: decoded.userId })
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' })
    }
    
    req.user = user
    next()
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' })
  }
}

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }
  next()
}