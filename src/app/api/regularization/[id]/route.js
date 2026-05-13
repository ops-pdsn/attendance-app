import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

// PATCH /api/regularization/[id] — approve or reject
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = ['admin', 'hr', 'manager'].includes(session.user.role)
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { action, rejectionReason } = await request.json()
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const reg = await prisma.attendanceRegularization.findUnique({
      where: { id: params.id },
      include: { user: { select: { id: true, name: true } } }
    })
    if (!reg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (reg.status !== 'pending') return NextResponse.json({ error: 'Request already processed' }, { status: 409 })

    const updated = await prisma.attendanceRegularization.update({
      where: { id: params.id },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        rejectionReason: action === 'reject' ? rejectionReason : null
      }
    })

    // If approved, update the actual attendance record
    if (action === 'approve') {
      const attendanceDate = new Date(reg.date)
      attendanceDate.setHours(0, 0, 0, 0)

      const existing = await prisma.attendance.findFirst({
        where: { userId: reg.userId, date: attendanceDate }
      })

      if (existing) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: reg.requestedStatus,
            session: reg.requestedSession || existing.session,
            punchIn: reg.requestedPunchIn || existing.punchIn,
            punchOut: reg.requestedPunchOut || existing.punchOut
          }
        })
      } else {
        await prisma.attendance.create({
          data: {
            userId: reg.userId,
            date: attendanceDate,
            status: reg.requestedStatus,
            session: reg.requestedSession || 'full_day',
            punchIn: reg.requestedPunchIn,
            punchOut: reg.requestedPunchOut
          }
        })
      }
    }

    // Notify the employee
    await prisma.notification.create({
      data: {
        userId: reg.userId,
        title: `Regularization ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: action === 'approve'
          ? `Your attendance regularization for ${new Date(reg.date).toLocaleDateString()} has been approved.`
          : `Your attendance regularization for ${new Date(reg.date).toLocaleDateString()} was rejected. ${rejectionReason || ''}`,
        type: action === 'approve' ? 'success' : 'warning',
        link: '/regularization'
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/regularization/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/regularization/[id] — cancel own pending request
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reg = await prisma.attendanceRegularization.findUnique({ where: { id: params.id } })
    if (!reg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (reg.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (reg.status !== 'pending') return NextResponse.json({ error: 'Cannot cancel a processed request' }, { status: 409 })

    await prisma.attendanceRegularization.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/regularization/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
