import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/leave/types - Get all leave types
export async function GET() {
  try {
    const leaveTypes = await prisma.leaveType.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(leaveTypes)
  } catch (error) {
    console.error('Get leave types error:', error)
    return NextResponse.json({ error: 'Failed to fetch leave types' }, { status: 500 })
  }
}

// POST /api/leave/types - Create new leave type
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['admin', 'hr'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, color, defaultDays, isPaid, carryForward, description } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
    }

    // Check if code exists
    const existing = await prisma.leaveType.findUnique({ where: { code: code.toUpperCase() } })
    if (existing) {
      return NextResponse.json({ error: 'Leave type code already exists' }, { status: 400 })
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        name,
        code: code.toUpperCase(),
        color: color || '#3b82f6',
        defaultDays: defaultDays || 12,
        isPaid: isPaid ?? true,
        carryForward: carryForward ?? false,
        description: description || null
      }
    })

    // Create leave balances for all existing users
    try {
      const users = await prisma.user.findMany({ where: { isActive: true } })
      const currentYear = new Date().getFullYear()
      
      await prisma.leaveBalance.createMany({
        data: users.map(user => ({
          userId: user.id,
          leaveTypeId: leaveType.id,
          year: currentYear,
          total: leaveType.defaultDays,
          used: 0,
          pending: 0,
          carryForward: 0
        })),
        skipDuplicates: true
      })
    } catch (e) {
      console.log('Leave balance creation skipped:', e.message)
    }

    return NextResponse.json(leaveType, { status: 201 })
  } catch (error) {
    console.error('Create leave type error:', error)
    return NextResponse.json({ error: 'Failed to create leave type' }, { status: 500 })
  }
}