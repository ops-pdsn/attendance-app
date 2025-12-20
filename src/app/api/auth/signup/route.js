import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, email, password, department, phone } = body

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate employee ID
    const userCount = await prisma.user.count()
    const employeeId = `EMP${String(userCount + 1).padStart(4, '0')}`

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        department: department || null,
        phone: phone || null,
        employeeId,
        role: 'employee' // Default role
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        employeeId: true,
        role: true,
        createdAt: true
      }
    })

    // Create default leave balances if leave types exist
    try {
      const leaveTypes = await prisma.leaveType.findMany()
      if (leaveTypes.length > 0) {
        await prisma.leaveBalance.createMany({
          data: leaveTypes.map(type => ({
            userId: user.id,
            leaveTypeId: type.id,
            total: type.defaultDays,
            used: 0,
            pending: 0,
            available: type.defaultDays
          }))
        })
      }
    } catch (e) {
      // Leave balance creation is optional, ignore errors
      console.log('Could not create leave balances:', e.message)
    }

    return NextResponse.json({
      message: 'Account created successfully',
      user
    }, { status: 201 })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    )
  }
}