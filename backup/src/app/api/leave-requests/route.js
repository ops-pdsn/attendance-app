import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '@/lib/db'

// Helper function to calculate working days
function calculateWorkingDays(startDate, endDate, type, holidays) {
  let days = 0
  const current = new Date(startDate)
  const end = new Date(endDate)
  
  const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]))

  while (current <= end) {
    const dayOfWeek = current.getDay()
    const dateStr = current.toISOString().split('T')[0]
    
    // Skip weekends and holidays
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
      days += type === 'full' ? 1 : 0.5
    }
    
    current.setDate(current.getDate() + 1)
  }

  return days
}

// GET /api/leave-requests - Get leave requests
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const pending = searchParams.get('pending') === 'true'
    const team = searchParams.get('team') === 'true'

    let where = {}

    if (team && (session.user.role === 'admin' || session.user.role === 'hr')) {
      // Admin/HR can see all requests
      if (status) where.status = status
      if (userId) where.userId = userId
    } else if (pending && (session.user.role === 'admin' || session.user.role === 'hr')) {
      // Get pending requests for approval
      where.status = 'pending'
    } else if (team) {
      // Manager can see their team's requests
      where.OR = [
        { userId: session.user.id },
        { user: { managerId: session.user.id } }
      ]
      if (status) where.status = status
    } else {
      // Regular user sees only their own requests
      where.userId = session.user.id
      if (status) where.status = status
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            manager: {
              select: { id: true, name: true }
            }
          }
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            code: true,
            color: true
          }
        },
        approver: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('GET /api/leave-requests error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/leave-requests - Apply for leave
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { leaveTypeId, startDate, endDate, type, reason, emergencyContact } = body

    if (!leaveTypeId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Leave type, start date, and end date are required' }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) {
      return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 })
    }

    // Get holidays for the date range
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: start,
          lte: end
        }
      }
    })

    // Calculate working days
    const days = calculateWorkingDays(start, end, type || 'full', holidays)

    if (days <= 0) {
      return NextResponse.json({ error: 'No working days in selected range' }, { status: 400 })
    }

    // Check leave balance
    const year = start.getFullYear()
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId: session.user.id,
          leaveTypeId,
          year
        }
      }
    })

    const available = balance ? (balance.total + balance.carryForward - balance.used - balance.pending) : 0

    // Get leave type to check if it requires balance
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId }
    })

    if (!leaveType) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 })
    }

    // Check if enough balance (except for LOP)
    if (leaveType.code !== 'LOP' && days > available) {
      return NextResponse.json({ 
        error: `Insufficient leave balance. Available: ${available} days, Requested: ${days} days` 
      }, { status: 400 })
    }

    // Check for overlapping requests
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['pending', 'approved'] },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start }
          }
        ]
      }
    })

    if (overlapping) {
      return NextResponse.json({ error: 'You already have a leave request for these dates' }, { status: 400 })
    }

    // Create leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: session.user.id,
        leaveTypeId,
        startDate: start,
        endDate: end,
        days,
        type: type || 'full',
        reason,
        emergencyContact,
        status: 'pending'
      },
      include: {
        leaveType: true,
        user: {
          select: { name: true, manager: { select: { id: true, name: true } } }
        }
      }
    })

    // Update pending balance
    if (balance) {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { pending: { increment: days } }
      })
    }

    // Create notification for manager
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { manager: true }
    })

    if (user?.manager) {
      await prisma.notification.create({
        data: {
          userId: user.manager.id,
          title: 'New Leave Request',
          message: `${user.name} has requested ${days} day(s) of ${leaveType.name} from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
          type: 'leave',
          link: '/leave/approvals'
        }
      })
    }

    // Also notify HR
    const hrUsers = await prisma.user.findMany({
      where: { role: { in: ['hr', 'admin'] } }
    })

    for (const hr of hrUsers) {
      if (hr.id !== session.user.id && hr.id !== user?.manager?.id) {
        await prisma.notification.create({
          data: {
            userId: hr.id,
            title: 'New Leave Request',
            message: `${user?.name} has requested ${days} day(s) of ${leaveType.name}`,
            type: 'leave',
            link: '/leave/approvals'
          }
        })
      }
    }

    return NextResponse.json(leaveRequest, { status: 201 })
  } catch (error) {
    console.error('POST /api/leave-requests error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}