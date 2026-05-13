import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/late-alerts?date=YYYY-MM-DD
// Returns late arrivals and early departures for a given date
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const targetDate = new Date(dateParam)
    targetDate.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dateParam + 'T23:59:59.999Z')

    // Get attendance with user shift info
    const attendance = await prisma.attendance.findMany({
      where: {
        date: { gte: targetDate, lte: dayEnd },
        status: { in: ['office', 'field', 'wfh'] }
      },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, department: true, employeeId: true,
            userShifts: {
              where: { isActive: true, startDate: { lte: new Date() } },
              include: { shift: true },
              orderBy: { startDate: 'desc' },
              take: 1
            }
          }
        }
      }
    })

    const lateArrivals = []
    const earlyDepartures = []

    for (const att of attendance) {
      const shift = att.user.userShifts[0]?.shift
      if (!shift) continue

      // Parse shift times
      const [startH, startM] = shift.startTime.split(':').map(Number)
      const [endH, endM] = shift.endTime.split(':').map(Number)
      const graceMinutes = shift.graceMinutes || 15

      const shiftStart = new Date(targetDate)
      shiftStart.setHours(startH, startM, 0, 0)
      const lateThreshold = new Date(shiftStart.getTime() + graceMinutes * 60000)

      const shiftEnd = new Date(targetDate)
      shiftEnd.setHours(endH, endM, 0, 0)

      if (att.punchIn && att.punchIn > lateThreshold) {
        const minutesLate = Math.round((att.punchIn - shiftStart) / 60000)
        lateArrivals.push({
          userId: att.user.id,
          name: att.user.name,
          email: att.user.email,
          department: att.user.department,
          employeeId: att.user.employeeId,
          punchIn: att.punchIn,
          shiftStart: shiftStart.toISOString(),
          minutesLate,
          shift: shift.name
        })
      }

      if (att.punchOut && att.punchOut < shiftEnd) {
        const minutesEarly = Math.round((shiftEnd - att.punchOut) / 60000)
        if (minutesEarly > graceMinutes) {
          earlyDepartures.push({
            userId: att.user.id,
            name: att.user.name,
            email: att.user.email,
            department: att.user.department,
            employeeId: att.user.employeeId,
            punchOut: att.punchOut,
            shiftEnd: shiftEnd.toISOString(),
            minutesEarly,
            shift: shift.name
          })
        }
      }
    }

    return NextResponse.json({
      date: dateParam,
      lateArrivals: lateArrivals.sort((a, b) => b.minutesLate - a.minutesLate),
      earlyDepartures: earlyDepartures.sort((a, b) => b.minutesEarly - a.minutesEarly),
      summary: {
        totalPresent: attendance.length,
        lateCount: lateArrivals.length,
        earlyCount: earlyDepartures.length
      }
    })
  } catch (error) {
    console.error('GET /api/late-alerts error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
