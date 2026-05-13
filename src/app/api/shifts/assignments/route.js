import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

// GET /api/shifts/assignments
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assignments = await prisma.userShift.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true, department: true } },
        shift: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('GET /api/shifts/assignments error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/shifts/assignments
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['admin', 'hr'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, shiftId, startDate, endDate } = body

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get shift details
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId }
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    // Check if user already has this shift assigned
    const existingAssignment = await prisma.userShift.findFirst({
      where: { userId, shiftId, isActive: true }
    })

    if (existingAssignment) {
      return NextResponse.json({ error: 'User already has this shift assigned' }, { status: 400 })
    }

    // Deactivate existing active assignments for this user
    const previousAssignment = await prisma.userShift.findFirst({
      where: { userId, isActive: true },
      include: { shift: true }
    })

    if (previousAssignment) {
      await prisma.userShift.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false, endDate: new Date() }
      })
    }

    // Create new assignment
    const assignment = await prisma.userShift.create({
      data: {
        userId,
        shiftId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true
      },
      include: {
        user: { select: { id: true, name: true } },
        shift: true
      }
    })

    // ✅ NOTIFICATION: Notify user about new shift assignment
    const startDateFormatted = new Date(startDate).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })

    await prisma.notification.create({
      data: {
        userId: userId,
        title: '📅 New Shift Assigned',
        message: `You have been assigned to "${shift.name}" (${shift.startTime} - ${shift.endTime}) starting ${startDateFormatted}`,
        type: 'info',
        link: '/shifts'
      }
    })

    // ✅ NOTIFICATION: If shift changed, notify about the change
    if (previousAssignment && previousAssignment.shiftId !== shiftId) {
      await prisma.notification.create({
        data: {
          userId: userId,
          title: '🔄 Shift Changed',
          message: `Your shift has been changed from "${previousAssignment.shift.name}" to "${shift.name}"`,
          type: 'warning',
          link: '/shifts'
        }
      })
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error('POST /api/shifts/assignments error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}