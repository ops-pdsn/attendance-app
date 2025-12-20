const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Hash password - all demo users will have password: "password123"
  const hashedPassword = await bcrypt.hash('password123', 12)

  // ============================================
  // 1. CREATE 10 DEMO USERS
  // ============================================
  console.log('👥 Creating users...')

  const users = await Promise.all([
    // Admin
    prisma.user.upsert({
      where: { email: 'admin@demo.com' },
      update: {},
      create: {
        email: 'admin@demo.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        department: 'Management',
        employeeId: 'EMP0001',
        phone: '+91 9876543210',
        isActive: true
      }
    }),
    // HR
    prisma.user.upsert({
      where: { email: 'hr@demo.com' },
      update: {},
      create: {
        email: 'hr@demo.com',
        password: hashedPassword,
        name: 'Priya Sharma',
        role: 'hr',
        department: 'Human Resources',
        employeeId: 'EMP0002',
        phone: '+91 9876543211',
        isActive: true
      }
    }),
    // Manager
    prisma.user.upsert({
      where: { email: 'manager@demo.com' },
      update: {},
      create: {
        email: 'manager@demo.com',
        password: hashedPassword,
        name: 'Rajesh Kumar',
        role: 'manager',
        department: 'Engineering',
        employeeId: 'EMP0003',
        phone: '+91 9876543212',
        isActive: true
      }
    }),
    // Employees
    prisma.user.upsert({
      where: { email: 'amit@demo.com' },
      update: {},
      create: {
        email: 'amit@demo.com',
        password: hashedPassword,
        name: 'Amit Patel',
        role: 'employee',
        department: 'Engineering',
        employeeId: 'EMP0004',
        phone: '+91 9876543213',
        isActive: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'neha@demo.com' },
      update: {},
      create: {
        email: 'neha@demo.com',
        password: hashedPassword,
        name: 'Neha Gupta',
        role: 'employee',
        department: 'Engineering',
        employeeId: 'EMP0005',
        phone: '+91 9876543214',
        isActive: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'vikram@demo.com' },
      update: {},
      create: {
        email: 'vikram@demo.com',
        password: hashedPassword,
        name: 'Vikram Singh',
        role: 'employee',
        department: 'Sales',
        employeeId: 'EMP0006',
        phone: '+91 9876543215',
        isActive: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'ananya@demo.com' },
      update: {},
      create: {
        email: 'ananya@demo.com',
        password: hashedPassword,
        name: 'Ananya Reddy',
        role: 'employee',
        department: 'Sales',
        employeeId: 'EMP0007',
        phone: '+91 9876543216',
        isActive: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'rahul@demo.com' },
      update: {},
      create: {
        email: 'rahul@demo.com',
        password: hashedPassword,
        name: 'Rahul Verma',
        role: 'employee',
        department: 'Marketing',
        employeeId: 'EMP0008',
        phone: '+91 9876543217',
        isActive: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'pooja@demo.com' },
      update: {},
      create: {
        email: 'pooja@demo.com',
        password: hashedPassword,
        name: 'Pooja Mehta',
        role: 'employee',
        department: 'Marketing',
        employeeId: 'EMP0009',
        phone: '+91 9876543218',
        isActive: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'suresh@demo.com' },
      update: {},
      create: {
        email: 'suresh@demo.com',
        password: hashedPassword,
        name: 'Suresh Nair',
        role: 'employee',
        department: 'Finance',
        employeeId: 'EMP0010',
        phone: '+91 9876543219',
        isActive: true
      }
    })
  ])

  console.log(`✅ Created ${users.length} users`)

  // ============================================
  // 2. CREATE LEAVE TYPES
  // ============================================
  console.log('🏖️ Creating leave types...')

  const leaveTypes = await Promise.all([
    prisma.leaveType.upsert({
      where: { code: 'CL' },
      update: {},
      create: {
        name: 'Casual Leave',
        code: 'CL',
        color: '#3b82f6',
        defaultDays: 12,
        isPaid: true,
        carryForward: false
      }
    }),
    prisma.leaveType.upsert({
      where: { code: 'SL' },
      update: {},
      create: {
        name: 'Sick Leave',
        code: 'SL',
        color: '#ef4444',
        defaultDays: 10,
        isPaid: true,
        carryForward: false
      }
    }),
    prisma.leaveType.upsert({
      where: { code: 'EL' },
      update: {},
      create: {
        name: 'Earned Leave',
        code: 'EL',
        color: '#10b981',
        defaultDays: 15,
        isPaid: true,
        carryForward: true
      }
    }),
    prisma.leaveType.upsert({
      where: { code: 'LWP' },
      update: {},
      create: {
        name: 'Leave Without Pay',
        code: 'LWP',
        color: '#f59e0b',
        defaultDays: 365,
        isPaid: false,
        carryForward: false
      }
    })
  ])

  console.log(`✅ Created ${leaveTypes.length} leave types`)

  // ============================================
  // 3. CREATE LEAVE BALANCES FOR EACH USER
  // ============================================
  console.log('💰 Creating leave balances...')

  const currentYear = new Date().getFullYear()
  let balanceCount = 0
  
  for (const user of users) {
    for (const leaveType of leaveTypes) {
      const used = Math.floor(Math.random() * 3) // Random 0-2 used
      await prisma.leaveBalance.upsert({
        where: {
          userId_leaveTypeId_year: {
            userId: user.id,
            leaveTypeId: leaveType.id,
            year: currentYear
          }
        },
        update: {},
        create: {
          userId: user.id,
          leaveTypeId: leaveType.id,
          year: currentYear,
          total: leaveType.defaultDays,
          used: used,
          pending: 0,
          carryForward: 0
        }
      })
      balanceCount++
    }
  }

  console.log(`✅ Created ${balanceCount} leave balances`)

  // ============================================
  // 4. CREATE ATTENDANCE RECORDS (Last 7 days)
  // ============================================
  console.log('📅 Creating attendance records...')

  const today = new Date()
  let attendanceCount = 0

  for (const user of users) {
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue

      // Random status: 80% office, 15% field, 5% leave
      const rand = Math.random()
      const status = rand < 0.8 ? 'office' : rand < 0.95 ? 'field' : 'leave'

      // Random punch times
      const punchInHour = 8 + Math.floor(Math.random() * 2) // 8-9 AM
      const punchInMin = Math.floor(Math.random() * 60)
      const punchOutHour = 17 + Math.floor(Math.random() * 2) // 5-6 PM
      const punchOutMin = Math.floor(Math.random() * 60)

      const punchIn = new Date(date)
      punchIn.setHours(punchInHour, punchInMin, 0, 0)

      const punchOut = new Date(date)
      punchOut.setHours(punchOutHour, punchOutMin, 0, 0)

      try {
        await prisma.attendance.create({
          data: {
            userId: user.id,
            date: date,
            status: status,
            session: 'full_day',
            punchIn: status !== 'leave' ? punchIn : null,
            punchOut: status !== 'leave' ? punchOut : null,
            location: status === 'field' ? 'Client Site' : status === 'office' ? 'Main Office' : null
          }
        })
        attendanceCount++
      } catch (e) {
        // Skip if already exists
      }
    }
  }

  console.log(`✅ Created ${attendanceCount} attendance records`)

  // ============================================
  // 5. CREATE SAMPLE TASKS
  // ============================================
  console.log('📝 Creating tasks...')

  const taskTitles = [
    'Complete project report',
    'Team meeting preparation',
    'Code review',
    'Client call',
    'Update documentation',
    'Bug fixing',
    'Feature development',
    'Testing',
    'Deployment',
    'Training session'
  ]

  let taskCount = 0
  for (const user of users.slice(0, 5)) { // First 5 users
    for (let i = 0; i < 3; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)

      await prisma.task.create({
        data: {
          userId: user.id,
          title: taskTitles[Math.floor(Math.random() * taskTitles.length)],
          date: date,
          type: i === 0 ? 'daily' : 'upcoming',
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          completed: Math.random() > 0.7,
          notes: 'Sample task for testing'
        }
      })
      taskCount++
    }
  }

  console.log(`✅ Created ${taskCount} tasks`)

  // ============================================
  // 6. PRINT LOGIN CREDENTIALS
  // ============================================
  console.log('\n' + '='.repeat(50))
  console.log('🎉 SEED COMPLETED SUCCESSFULLY!')
  console.log('='.repeat(50))
  console.log('\n📧 LOGIN CREDENTIALS (Password for all: password123)\n')
  console.log('┌─────────────────────┬──────────────────┬─────────────┐')
  console.log('│ Email               │ Name             │ Role        │')
  console.log('├─────────────────────┼──────────────────┼─────────────┤')
  console.log('│ admin@demo.com      │ Admin User       │ admin       │')
  console.log('│ hr@demo.com         │ Priya Sharma     │ hr          │')
  console.log('│ manager@demo.com    │ Rajesh Kumar     │ manager     │')
  console.log('│ amit@demo.com       │ Amit Patel       │ employee    │')
  console.log('│ neha@demo.com       │ Neha Gupta       │ employee    │')
  console.log('│ vikram@demo.com     │ Vikram Singh     │ employee    │')
  console.log('│ ananya@demo.com     │ Ananya Reddy     │ employee    │')
  console.log('│ rahul@demo.com      │ Rahul Verma      │ employee    │')
  console.log('│ pooja@demo.com      │ Pooja Mehta      │ employee    │')
  console.log('│ suresh@demo.com     │ Suresh Nair      │ employee    │')
  console.log('└─────────────────────┴──────────────────┴─────────────┘')
  console.log('\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })