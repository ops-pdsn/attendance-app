// Run this script to create an admin user
// Usage: node scripts/create-admin.js

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@example.com'
  const password = 'admin123'
  const name = 'Administrator'
  
  // Check if admin already exists
  const existing = await prisma.user.findUnique({ where: { email } })
  
  if (existing) {
    console.log('Admin user already exists!')
    console.log('Email:', email)
    return
  }
  
  // Create admin user
  const hashedPassword = await bcrypt.hash(password, 12)
  
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'admin',
      department: 'Management',
      employeeId: 'ADMIN001',
      isActive: true,
    }
  })
  
  console.log('✓ Admin user created successfully!')
  console.log('')
  console.log('Login credentials:')
  console.log('  Email:', email)
  console.log('  Password:', password)
  console.log('')
  console.log('IMPORTANT: Change the password after first login!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
