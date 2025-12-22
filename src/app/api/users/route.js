import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// GET /api/users - Get all users
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const team = searchParams.get('team')

    let where = { isActive: true }
    
    // For team dashboard, filter by manager's subordinates if needed
    if (team && session.user.role === 'manager') {
      where.managerId = session.user.id
    }

    const users = await prisma.user.findMany({
      where,
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
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST /api/users - Create new user
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and HR can create users
    if (!['admin', 'hr'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role, department, employeeId, phone } = body

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate employee ID if not provided
    const finalEmployeeId = employeeId || `EMP${String(await prisma.user.count() + 1).padStart(4, '0')}`

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'employee',
        department: department || null,
        employeeId: finalEmployeeId,
        phone: phone || null,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        employeeId: true
      }
    })

    // Create default leave balances
    try {
      const leaveTypes = await prisma.leaveType.findMany()
      const currentYear = new Date().getFullYear()
      
      if (leaveTypes.length > 0) {
        await prisma.leaveBalance.createMany({
          data: leaveTypes.map(lt => ({
            userId: user.id,
            leaveTypeId: lt.id,
            year: currentYear,
            total: lt.defaultDays,
            used: 0,
            pending: 0,
            carryForward: 0
          })),
          skipDuplicates: true
        })
      }
    } catch (e) {
      console.log('Leave balance creation skipped:', e.message)
    }

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}