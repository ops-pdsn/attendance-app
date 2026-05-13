import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { action, rejectionReason } = await request.json()
    const enc = await prisma.leaveEncashment.findUnique({ where: { id: params.id } })
    if (!enc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (enc.status !== 'pending') return NextResponse.json({ error: 'Already processed' }, { status: 409 })

    const newStatus = action === 'approve' ? 'approved' : action === 'process' ? 'processed' : 'rejected'

    const updated = await prisma.leaveEncashment.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        approvedBy: session.user.id,
        approvedAt: new Date(),
        rejectionReason: action === 'reject' ? rejectionReason : null
      }
    })

    // If approved, deduct from leave balance
    if (action === 'approve') {
      await prisma.leaveBalance.updateMany({
        where: { userId: enc.userId, leaveTypeId: enc.leaveTypeId, year: enc.year },
        data: { used: { increment: enc.days } }
      })
    }

    await prisma.notification.create({
      data: {
        userId: enc.userId,
        title: `Leave Encashment ${newStatus === 'approved' ? 'Approved' : newStatus === 'rejected' ? 'Rejected' : 'Processed'}`,
        message: newStatus === 'approved'
          ? `Your leave encashment of ${enc.days} days has been approved.`
          : newStatus === 'rejected'
          ? `Your leave encashment request was rejected. ${rejectionReason || ''}`
          : `Your leave encashment of ${enc.days} days has been processed.`,
        type: newStatus === 'approved' || newStatus === 'processed' ? 'success' : 'warning',
        link: '/leave?tab=encashment'
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/leave-encashment/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
