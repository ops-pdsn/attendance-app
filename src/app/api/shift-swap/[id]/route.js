import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { action } = await request.json()
    const swap = await prisma.shiftSwapRequest.findUnique({
      where: { id: params.id },
      include: {
        requester: { select: { id: true, name: true } },
        targetUser: { select: { id: true, name: true } }
      }
    })
    if (!swap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isAdmin = ['admin', 'hr', 'manager'].includes(session.user.role)
    const isTarget = swap.targetUserId === session.user.id

    // Target user can accept/reject; admin/manager can give final approval
    if (action === 'accept' && isTarget && swap.status === 'pending') {
      await prisma.shiftSwapRequest.update({
        where: { id: params.id },
        data: { status: 'accepted' }
      })
      // Notify managers for final approval
      const managers = await prisma.user.findMany({
        where: { role: { in: ['admin', 'hr', 'manager'] }, isActive: true },
        select: { id: true }
      })
      await prisma.notification.createMany({
        data: managers.map(m => ({
          userId: m.id,
          title: 'Shift Swap Pending Approval',
          message: `${swap.requester.name} and ${swap.targetUser.name} agreed to swap shifts on ${new Date(swap.date).toLocaleDateString()}. Awaiting your approval.`,
          type: 'info',
          link: '/shifts?tab=swap'
        }))
      })
      await prisma.notification.create({
        data: {
          userId: swap.requesterId,
          title: 'Shift Swap Accepted',
          message: `${swap.targetUser.name} accepted your shift swap request. Awaiting manager approval.`,
          type: 'success',
          link: '/shifts?tab=swap'
        }
      })
    } else if (action === 'reject' && (isTarget || isAdmin) && ['pending', 'accepted'].includes(swap.status)) {
      await prisma.shiftSwapRequest.update({ where: { id: params.id }, data: { status: 'rejected' } })
      await prisma.notification.create({
        data: {
          userId: swap.requesterId,
          title: 'Shift Swap Rejected',
          message: `Your shift swap request for ${new Date(swap.date).toLocaleDateString()} was rejected.`,
          type: 'warning',
          link: '/shifts?tab=swap'
        }
      })
    } else if (action === 'approve' && isAdmin && swap.status === 'accepted') {
      await prisma.shiftSwapRequest.update({
        where: { id: params.id },
        data: { status: 'manager_approved', approvedBy: session.user.id, approvedAt: new Date() }
      })
      // Notify both parties
      await prisma.notification.createMany({
        data: [swap.requesterId, swap.targetUserId].map(uid => ({
          userId: uid,
          title: 'Shift Swap Approved',
          message: `The shift swap for ${new Date(swap.date).toLocaleDateString()} has been approved by management.`,
          type: 'success',
          link: '/shifts?tab=swap'
        }))
      })
    } else {
      return NextResponse.json({ error: 'Invalid action or insufficient permissions' }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/shift-swap/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
