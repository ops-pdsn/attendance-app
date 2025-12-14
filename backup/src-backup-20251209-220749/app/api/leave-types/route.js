import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '@/lib/db'

// GET /api/leave-types - Get all leave types
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leaveTypes = await prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(leaveTypes)
  } catch (error) {
    console.error('GET /api/leave-types error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/leave-types - Create new leave type (admin only)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, description, color, defaultDays, carryForward, maxCarryForward, requiresApproval, isPaid } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        name,
        code: code.toUpperCase(),
        description,
        color: color || '#3b82f6',
        defaultDays: defaultDays || 0,
        carryForward: carryForward || false,
        maxCarryForward: maxCarryForward || 0,
        requiresApproval: requiresApproval !== false,
        isPaid: isPaid !== false
      }
    })

    return NextResponse.json(leaveType, { status: 201 })
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Leave type code already exists' }, { status: 400 })
    }
    console.error('POST /api/leave-types error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}