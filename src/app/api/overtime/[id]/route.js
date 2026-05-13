import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ot = await prisma.overtimeRequest.findUnique({ where: { id: params.id } })
    if (!ot) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isAdmin = ['admin', 'hr', 'manager'].includes(session.user.role)
    const isOwner = ot.userId === session.user.id

    if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (isOwner && !isAdmin && ot.status !== 'pending')
      return NextResponse.json({ error: 'Only pending requests can be cancelled' }, { status: 409 })

    await prisma.overtimeRequest.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/overtime/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = ['admin', 'hr', 'manager'].includes(session.user.role)
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { action, compOffGranted, rejectionReason } = await request.json()
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const ot = await prisma.overtimeRequest.findUnique({ where: { id: params.id } })
    if (!ot) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (ot.status !== 'pending') return NextResponse.json({ error: 'Already processed' }, { status: 409 })

    const updated = await prisma.overtimeRequest.update({
      where: { id: params.id },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        approvedBy: session.user.id,
        approvedAt: new Date(),
        compOffGranted: action === 'approve' ? (compOffGranted ?? false) : false,
        rejectionReason: action === 'reject' ? rejectionReason : null
      }
    })

    // If approved with comp-off, update comp-off balance
    if (action === 'approve' && compOffGranted) {
      const year = new Date(ot.date).getFullYear()
      const compOffDays = ot.hours >= 8 ? 1 : 0.5
      await prisma.compOffBalance.upsert({
        where: { userId_year: { userId: ot.userId, year } },
        update: { earned: { increment: compOffDays } },
        create: { userId: ot.userId, year, earned: compOffDays, used: 0 }
      })
    }

    // Notify employee
    await prisma.notification.create({
      data: {
        userId: ot.userId,
        title: `Overtime ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: action === 'approve'
          ? `Your overtime request for ${new Date(ot.date).toLocaleDateString()} has been approved.${compOffGranted ? ' Comp-off has been added to your balance.' : ''}`
          : `Your overtime request for ${new Date(ot.date).toLocaleDateString()} was rejected. ${rejectionReason || ''}`,
        type: action === 'approve' ? 'success' : 'warning',
        link: '/overtime'
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/overtime/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
