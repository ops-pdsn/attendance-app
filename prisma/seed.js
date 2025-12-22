const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  const hashedPassword = await bcrypt.hash('password123', 12)

  // ============================================
  // 1. CREATE 10 DEMO USERS
  // ============================================
  console.log('👥 Creating users...')

  const users = await Promise.all([
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
  // 2. CREATE COMPREHENSIVE LEAVE TYPES
  // ============================================
  console.log('🏖️ Creating leave types...')

  const leaveTypes = await Promise.all([
    // PAID LEAVES
    prisma.leaveType.upsert({
      where: { code: 'PL' },
      update: {},
      create: {
        name: 'Paid Leave',
        code: 'PL',
        color: '#10b981',
        defaultDays: 21, // 1.75 * 12 months
        isPaid: true,
        carryForward: true,
        description: 'Monthly accrual of 1.75 days'
      }
    }),
    prisma.leaveType.upsert({
      where: { code: 'SL' },
      update: {},
      create: {
        name: 'Sick Leave',
        code: 'SL',
        color: '#ef4444',
        defaultDays: 12,
        isPaid: true,
        carryForward: false,
        description: 'For illness and medical needs'
      }
    }),
    prisma.leaveType.upsert({
      where: { code: 'CO' },
      update: {},
      create: {
        name: 'Comp-Off',
        code: 'CO',
        color: '#8b5cf6',
        defaultDays: 0, // Earned by working extra
        isPaid: true,
        carryForward: true,
        description: 'Compensatory off for extra work'
      }
    }),
    prisma.leaveType.upsert({
      where: { code: 'ML' },
      update: {},
      create: {
        name: 'Maternity Leave',
        code: 'ML',
        color: '#ec4899',
        defaultDays: 180,
        isPaid: true,
        carryForward: false,
        description: '26 weeks maternity leave'
      }
    }),
    prisma.leaveType.upsert({
      where: { code: 'PL2' },
      update: {},
      create: {
        name: 'Paternity Leave',
        code: 'PL2',
        color: '#06b6d4',
        defaultDays: 15,
        isPaid: true,
        carryForward: false,
        description: '15 days paternity leave'
      }
    }),
    // UNPAID / PARTIAL LEAVES
    prisma.leaveType.upsert({
      where: { code: 'HD' },
      update: {},
      create: {
        name: 'Half Day',
        code: 'HD',
        color: '#f59e0b',
        defaultDays: 999, // Unlimited
        isPaid: false,
        carryForward: false,
        description: 'Half day leave (0.5 day deducted)'
      }
    }),
    prisma.leaveType.upsert({
      where: { code: 'EL' },
      update: {},
      create: {
        name: 'Early Leaving',
        code: 'EL',
        color: '#f97316',
        defaultDays: 999,
        isPaid: false,
        carryForward: false,
        description: 'Leave office early'
      }
    }),
    prisma.leaveType.upsert({
      where: { code: 'LC' },
      update: {},
      create: {
        name: 'Late Coming',
        code: 'LC',
        color: '#eab308',
        defaultDays: 999,
        isPaid: false,
        carryForward: false,
        description: 'Arrive late to office'
      }
    }),
    prisma.leaveType.upsert({
      where: { code: 'EM' },
      update: {},
      create: {
        name: 'Emergency Leave',
        code: 'EM',
        color: '#dc2626',
        defaultDays: 3,
        isPaid: false,
        carryForward: false,
        description: 'For urgent emergencies'
      }
    }),
    prisma.leaveType.upsert({
      where: { code: 'LWP' },
      update: {},
      create: {
        name: 'Leave Without Pay',
        code: 'LWP',
        color: '#6b7280',
        defaultDays: 365,
        isPaid: false,
        carryForward: false,
        description: 'Unpaid leave'
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
      const used = Math.floor(Math.random() * 3)
      try {
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
      } catch (e) {
        // Skip if constraint error
      }
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
      date.setHours(0, 0, 0, 0)

      if (date.getDay() === 0 || date.getDay() === 6) continue

      const rand = Math.random()
      const status = rand < 0.8 ? 'office' : rand < 0.95 ? 'field' : 'leave'

      const punchInHour = 8 + Math.floor(Math.random() * 2)
      const punchInMin = Math.floor(Math.random() * 60)
      const punchOutHour = 17 + Math.floor(Math.random() * 2)
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
        // Skip duplicates
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
    'Update documentation'
  ]

  let taskCount = 0
  for (const user of users.slice(0, 5)) {
    for (let i = 0; i < 3; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)

      try {
        await prisma.task.create({
          data: {
            userId: user.id,
            title: taskTitles[Math.floor(Math.random() * taskTitles.length)],
            date: date,
            type: i === 0 ? 'daily' : 'upcoming',
            priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            completed: Math.random() > 0.7,
            notes: 'Sample task'
          }
        })
        taskCount++
      } catch (e) {
        // Skip errors
      }
    }
  }

  console.log(`✅ Created ${taskCount} tasks`)

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60))
  console.log('🎉 SEED COMPLETED SUCCESSFULLY!')
  console.log('='.repeat(60))
  console.log('\n📧 LOGIN CREDENTIALS (Password: password123)\n')
  console.log('┌──────────────────────┬──────────────────┬─────────────┐')
  console.log('│ Email                │ Name             │ Role        │')
  console.log('├──────────────────────┼──────────────────┼─────────────┤')
  console.log('│ admin@demo.com       │ Admin User       │ admin       │')
  console.log('│ hr@demo.com          │ Priya Sharma     │ hr          │')
  console.log('│ manager@demo.com     │ Rajesh Kumar     │ manager     │')
  console.log('│ amit@demo.com        │ Amit Patel       │ employee    │')
  console.log('│ neha@demo.com        │ Neha Gupta       │ employee    │')
  console.log('│ vikram@demo.com      │ Vikram Singh     │ employee    │')
  console.log('│ ananya@demo.com      │ Ananya Reddy     │ employee    │')
  console.log('│ rahul@demo.com       │ Rahul Verma      │ employee    │')
  console.log('│ pooja@demo.com       │ Pooja Mehta      │ employee    │')
  console.log('│ suresh@demo.com      │ Suresh Nair      │ employee    │')
  console.log('└──────────────────────┴──────────────────┴─────────────┘')
  console.log('\n🏖️ LEAVE TYPES CREATED:\n')
  console.log('┌──────┬─────────────────────┬────────┬─────────────────────────────┐')
  console.log('│ Code │ Name                │ Paid   │ Description                 │')
  console.log('├──────┼─────────────────────┼────────┼─────────────────────────────┤')
  console.log('│ PL   │ Paid Leave          │ ✅ Yes │ 1.75 days/month accrual     │')
  console.log('│ SL   │ Sick Leave          │ ✅ Yes │ Medical needs               │')
  console.log('│ CO   │ Comp-Off            │ ✅ Yes │ Extra work compensation     │')
  console.log('│ ML   │ Maternity Leave     │ ✅ Yes │ 26 weeks                    │')
  console.log('│ PL2  │ Paternity Leave     │ ✅ Yes │ 15 days                     │')
  console.log('│ HD   │ Half Day            │ ❌ No  │ 0.5 day deducted            │')
  console.log('│ EL   │ Early Leaving       │ ❌ No  │ Leave early                 │')
  console.log('│ LC   │ Late Coming         │ ❌ No  │ Arrive late                 │')
  console.log('│ EM   │ Emergency Leave     │ ❌ No  │ Urgent emergencies          │')
  console.log('│ LWP  │ Leave Without Pay   │ ❌ No  │ Unpaid leave                │')
  console.log('└──────┴─────────────────────┴────────┴─────────────────────────────┘')
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