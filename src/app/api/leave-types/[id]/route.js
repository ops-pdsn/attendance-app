import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/leave-types/[id] - Get single leave type
export async function GET(request, { params }) {
  try {
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: params.id }
    })

    if (!leaveType) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 })
    }

    return NextResponse.json(leaveType)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch leave type' }, { status: 500 })
  }
}

// PATCH /api/leave-types/[id] - Update leave type
export async function PATCH(request, { params }) {
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

    // Check if code is taken by another leave type
    if (code) {
      const existing = await prisma.leaveType.findFirst({
        where: {
          code: code.toUpperCase(),
          NOT: { id: params.id }
        }
      })
      if (existing) {
        return NextResponse.json({ error: 'Code already in use' }, { status: 400 })
      }
    }

    const leaveType = await prisma.leaveType.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(color && { color }),
        ...(defaultDays !== undefined && { defaultDays }),
        ...(isPaid !== undefined && { isPaid }),
        ...(carryForward !== undefined && { carryForward }),
        ...(description !== undefined && { description })
      }
    })

    return NextResponse.json(leaveType)
  } catch (error) {
    console.error('Update leave type error:', error)
    return NextResponse.json({ error: 'Failed to update leave type' }, { status: 500 })
  }
}

// DELETE /api/leave-types/[id] - Delete leave type
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['admin', 'hr'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete related balances first
    await prisma.leaveBalance.deleteMany({
      where: { leaveTypeId: params.id }
    })

    // Delete the leave type
    await prisma.leaveType.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete leave type error:', error)
    return NextResponse.json({ error: 'Failed to delete leave type' }, { status: 500 })
  }
}