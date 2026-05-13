import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = ['admin', 'hr', 'manager'].includes(session.user.role)
    const where = isAdmin
      ? {}
      : { OR: [{ requesterId: session.user.id }, { targetUserId: session.user.id }] }

    const swaps = await prisma.shiftSwapRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, email: true, department: true } },
        targetUser: { select: { id: true, name: true, email: true, department: true } },
        requesterShift: { select: { id: true, name: true, startTime: true, endTime: true } },
        targetShift: { select: { id: true, name: true, startTime: true, endTime: true } },
        approver: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(swaps)
  } catch (error) {
    console.error('GET /api/shift-swap error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date, targetUserId, requesterShiftId, targetShiftId, reason } = await request.json()
    if (!date || !targetUserId || !requesterShiftId || !targetShiftId) {
      return NextResponse.json({ error: 'Date, target user, and both shifts are required' }, { status: 400 })
    }
    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: 'Cannot swap shift with yourself' }, { status: 400 })
    }

    const swap = await prisma.shiftSwapRequest.create({
      data: {
        requesterId: session.user.id,
        targetUserId,
        requesterShiftId,
        targetShiftId,
        date: new Date(date),
        reason
      }
    })

    // Notify the target user
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: 'Shift Swap Request',
        message: `${session.user.name || session.user.email} has requested a shift swap with you for ${new Date(date).toLocaleDateString()}`,
        type: 'info',
        link: '/shifts?tab=swap'
      }
    })

    return NextResponse.json(swap, { status: 201 })
  } catch (error) {
    console.error('POST /api/shift-swap error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
