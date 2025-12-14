import bcrypt from 'bcryptjs'
import prisma from './db'

// Hash password
export async function hashPassword(password) {
  return await bcrypt.hash(password, 12)
}

// Verify password
export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword)
}

// Create user
export async function createUser(data) {
  const { email, password, name, role = 'employee', department, employeeId, phone } = data
  
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })
  
  if (existingUser) {
    throw new Error('User already exists')
  }
  
  // Hash password
  const hashedPassword = await hashPassword(password)
  
  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role,
      department,
      employeeId,
      phone
    }
  })
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

// Authenticate user
export async function authenticateUser(email, password) {
  const user = await prisma.user.findUnique({
    where: { email }
  })
  
  if (!user) {
    throw new Error('Invalid credentials')
  }
  
  if (!user.isActive) {
    throw new Error('Account is deactivated')
  }
  
  const isValid = await verifyPassword(password, user.password)
  
  if (!isValid) {
    throw new Error('Invalid credentials')
  }
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

// Get user by ID
export async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      employeeId: true,
      phone: true,
      isActive: true,
      createdAt: true
    }
  })
  
  return user
}