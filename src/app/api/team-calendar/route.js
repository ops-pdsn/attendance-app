import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/team-calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json({ error: 'start and end dates are required' }, { status: 400 })
    }

    const startDate = new Date(start)
    const endDate = new Date(end + 'T23:59:59.999Z')

    const isAdmin = ['admin', 'hr', 'manager'].includes(session.user.role)

    // Get all active users
    const users = await prisma.user.findMany({
      where: isAdmin ? { isActive: true } : { managerId: session.user.id, isActive: true },
      select: { id: true, name: true, department: true, role: true, employeeId: true }
    })

    const userIds = users.map(u => u.id)

    // Fetch attendance, leave, and holidays in parallel
    const [attendance, leaveRequests, holidays] = await Promise.all([
      prisma.attendance.findMany({
        where: { userId: { in: userIds }, date: { gte: startDate, lte: endDate } },
        select: { userId: true, date: true, status: true, session: true, punchIn: true, punchOut: true }
      }),
      prisma.leaveRequest.findMany({
        where: {
          userId: { in: userIds },
          status: 'approved',
          startDate: { lte: endDate },
          endDate: { gte: startDate }
        },
        include: { leaveType: { select: { name: true, color: true, code: true } } }
      }),
      prisma.holiday.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        select: { name: true, date: true, type: true }
      })
    ])

    // Build calendar map per user per date
    const calendarData = {}
    for (const user of users) {
      calendarData[user.id] = { user, days: {} }
    }

    for (const att of attendance) {
      const dateKey = new Date(att.date).toISOString().split('T')[0]
      if (calendarData[att.userId]) {
        calendarData[att.userId].days[dateKey] = {
          type: 'attendance',
          status: att.status,
          session: att.session,
          punchIn: att.punchIn,
          punchOut: att.punchOut
        }
      }
    }

    for (const lr of leaveRequests) {
      const lStart = new Date(lr.startDate)
      const lEnd = new Date(lr.endDate)
      const cursor = new Date(lStart)
      while (cursor <= lEnd) {
        const dateKey = cursor.toISOString().split('T')[0]
        if (calendarData[lr.userId] && !calendarData[lr.userId].days[dateKey]) {
          calendarData[lr.userId].days[dateKey] = {
            type: 'leave',
            leaveType: lr.leaveType.name,
            leaveCode: lr.leaveType.code,
            color: lr.leaveType.color
          }
        }
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    return NextResponse.json({
      users: Object.values(calendarData),
      holidays
    })
  } catch (error) {
    console.error('GET /api/team-calendar error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
