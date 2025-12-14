import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers, hr, and admins can access team data
    if (!['admin', 'hr', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    
    const date = dateParam ? new Date(dateParam) : new Date()
    date.setHours(0, 0, 0, 0)
    
    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    // Get all attendance for the date
    let where = {
      date: {
        gte: date,
        lte: endDate
      }
    }

    // If manager, filter by department or reporting structure
    if (session.user.role === 'manager') {
      where.user = {
        OR: [
          { department: session.user.department },
          { managerId: session.user.id }
        ]
      }
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        }
      },
      orderBy: { punchIn: 'asc' }
    })

    return NextResponse.json(attendance)
  } catch (error) {
    console.error('GET /api/attendance/team error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}