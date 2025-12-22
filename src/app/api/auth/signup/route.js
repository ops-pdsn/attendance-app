import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
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

    // Check if email already exists
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
        role: 'employee', // Default role for self-registration
        department: department || null,
        phone: phone || null,
        employeeId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true
      }
    })

    // Create default leave balances for the new user
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
      // Silently skip if leave balance creation fails
      console.log('Leave balance creation skipped:', e.message)
    }

    return NextResponse.json({
      success: true,
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