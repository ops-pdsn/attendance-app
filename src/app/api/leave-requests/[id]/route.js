import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import prisma from '@/lib/db'
import { sendLeaveApprovedEmail, sendLeaveRejectedEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// GET /api/leave-requests/[id] - Get single leave request
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            manager: { select: { id: true, name: true } }
          }
        },
        leaveType: true,
        approver: { select: { id: true, name: true } }
      }
    })

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // Check access
    const isOwner = leaveRequest.userId === session.user.id
    const isManager = leaveRequest.user.manager?.id === session.user.id
    const isAdmin = session.user.role === 'admin' || session.user.role === 'hr'

    if (!isOwner && !isManager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(leaveRequest)
  } catch (error) {
    console.error('GET /api/leave-requests/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/leave-requests/[id] - Update leave request (approve/reject/cancel)
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { action, rejectionReason } = body

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, managerId: true }
        },
        leaveType: true
      }
    })

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    const isOwner = leaveRequest.userId === session.user.id
    const isManager = leaveRequest.user.managerId === session.user.id
    const isAdmin = session.user.role === 'admin' || session.user.role === 'hr'

    // Handle different actions
    switch (action) {
      case 'approve':
        if (!isManager && !isAdmin) {
          return NextResponse.json({ error: 'Only managers can approve leave requests' }, { status: 403 })
        }

        if (leaveRequest.status !== 'pending') {
          return NextResponse.json({ error: 'Only pending requests can be approved' }, { status: 400 })
        }

        // Update request status
        await prisma.leaveRequest.update({
          where: { id },
          data: {
            status: 'approved',
            approvedBy: session.user.id,
            approvedAt: new Date()
          }
        })

        // Update leave balance (move from pending to used)
        const year = leaveRequest.startDate.getFullYear()
        await prisma.leaveBalance.update({
          where: {
            userId_leaveTypeId_year: {
              userId: leaveRequest.userId,
              leaveTypeId: leaveRequest.leaveTypeId,
              year
            }
          },
          data: {
            pending: { decrement: leaveRequest.days },
            used: { increment: leaveRequest.days }
          }
        })

        // Notify employee
        await prisma.notification.create({
          data: {
            userId: leaveRequest.userId,
            title: 'Leave Approved ✅',
            message: `Your ${leaveRequest.leaveType.name} request for ${leaveRequest.days} day(s) has been approved by ${session.user.name}`,
            type: 'success',
            link: '/leave'
          }
        })

        return NextResponse.json({ success: true, message: 'Leave request approved' })

      case 'reject':
        if (!isManager && !isAdmin) {
          return NextResponse.json({ error: 'Only managers can reject leave requests' }, { status: 403 })
        }

        if (leaveRequest.status !== 'pending') {
          return NextResponse.json({ error: 'Only pending requests can be rejected' }, { status: 400 })
        }

        // Update request status
        await prisma.leaveRequest.update({
          where: { id },
          data: {
            status: 'rejected',
            approvedBy: session.user.id,
            approvedAt: new Date(),
            rejectionReason
          }
        })

        // Restore pending balance
        const rejectYear = leaveRequest.startDate.getFullYear()
        await prisma.leaveBalance.update({
          where: {
            userId_leaveTypeId_year: {
              userId: leaveRequest.userId,
              leaveTypeId: leaveRequest.leaveTypeId,
              year: rejectYear
            }
          },
          data: {
            pending: { decrement: leaveRequest.days }
          }
        })

        // Notify employee
        await prisma.notification.create({
          data: {
            userId: leaveRequest.userId,
            title: 'Leave Rejected ❌',
            message: `Your ${leaveRequest.leaveType.name} request has been rejected${rejectionReason ? `: ${rejectionReason}` : ''}`,
            type: 'error',
            link: '/leave'
          }
        })

        return NextResponse.json({ success: true, message: 'Leave request rejected' })

      case 'cancel':
        if (!isOwner) {
          return NextResponse.json({ error: 'Only the requester can cancel their leave request' }, { status: 403 })
        }

        if (leaveRequest.status !== 'pending') {
          return NextResponse.json({ error: 'Only pending requests can be cancelled' }, { status: 400 })
        }

        // Update request status
        await prisma.leaveRequest.update({
          where: { id },
          data: { status: 'cancelled' }
        })

        // Restore pending balance
        const cancelYear = leaveRequest.startDate.getFullYear()
        await prisma.leaveBalance.update({
          where: {
            userId_leaveTypeId_year: {
              userId: leaveRequest.userId,
              leaveTypeId: leaveRequest.leaveTypeId,
              year: cancelYear
            }
          },
          data: {
            pending: { decrement: leaveRequest.days }
          }
        })

        return NextResponse.json({ success: true, message: 'Leave request cancelled' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('PATCH /api/leave-requests/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/leave-requests/[id] - Delete leave request
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id }
    })

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // Only owner or admin can delete
    if (leaveRequest.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only pending or cancelled can be deleted
    if (!['pending', 'cancelled', 'rejected'].includes(leaveRequest.status)) {
      return NextResponse.json({ error: 'Cannot delete approved leave requests' }, { status: 400 })
    }

    // Restore pending balance if needed
    if (leaveRequest.status === 'pending') {
      const year = leaveRequest.startDate.getFullYear()
      await prisma.leaveBalance.update({
        where: {
          userId_leaveTypeId_year: {
            userId: leaveRequest.userId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year
          }
        },
        data: {
          pending: { decrement: leaveRequest.days }
        }
      })
    }

    await prisma.leaveRequest.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Leave request deleted' })
  } catch (error) {
    console.error('DELETE /api/leave-requests/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// After approval
if (action === 'approve') {
  // ... existing approval code ...
  
  // Send email notification
  const startDateFormatted = new Date(leaveRequest.startDate).toLocaleDateString()
  const endDateFormatted = new Date(leaveRequest.endDate).toLocaleDateString()
  
  await sendLeaveApprovedEmail(
    leaveRequest.user.email,
    leaveRequest.user.name,
    leaveRequest.leaveType.name,
    startDateFormatted,
    endDateFormatted,
    session.user.name
  )
}

// After rejection
if (action === 'reject') {
  // ... existing rejection code ...
  
  // Send email notification
  await sendLeaveRejectedEmail(
    leaveRequest.user.email,
    leaveRequest.user.name,
    leaveRequest.leaveType.name,
    startDateFormatted,
    endDateFormatted,
    session.user.name,
    rejectionReason
  )
}