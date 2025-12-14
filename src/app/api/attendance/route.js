import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// ... rest of the file

// GET /api/attendance - Get attendance records
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const userId = searchParams.get('userId')

    // Build where clause
    let where = {}
    
    // Admin can view all, others only their own
    if (session.user.role === 'admin' || session.user.role === 'hr') {
      if (userId) {
        where.userId = userId
      }
    } else {
      where.userId = session.user.id
    }

    // Date filtering
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z')
      }
    }

    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        }
      }
    })

    return NextResponse.json(attendance)
  } catch (error) {
    console.error('GET /api/attendance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/attendance - Mark attendance
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      date, 
      status, 
      session: attendanceSession, 
      notes,
      latitude,
      longitude,
      location,
      accuracy
    } = body

    const attendanceDate = new Date(date)
    attendanceDate.setHours(0, 0, 0, 0)

    // Check if already marked for this date
    const existing = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        date: attendanceDate
      }
    })

    if (existing) {
      // Update existing record
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status,
          session: attendanceSession,
          notes,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          location,
          punchIn: existing.punchIn || new Date(),
          punchOut: new Date()
        }
      })
      return NextResponse.json(updated)
    }

    // Create new attendance record
    const attendance = await prisma.attendance.create({
      data: {
        userId: session.user.id,
        date: attendanceDate,
        status,
        session: attendanceSession || 'full',
        notes,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        location,
        punchIn: new Date()
      }
    })

    return NextResponse.json(attendance, { status: 201 })
  } catch (error) {
    console.error('POST /api/attendance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/attendance - Update attendance (edit times)
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, punchIn, punchOut, notes } = body

    const attendance = await prisma.attendance.findUnique({
      where: { id }
    })

    if (!attendance) {
      return NextResponse.json({ error: 'Attendance not found' }, { status: 404 })
    }

    // Only owner or admin can update
    if (attendance.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData = {}
    if (punchIn) updateData.punchIn = new Date(punchIn)
    if (punchOut) updateData.punchOut = new Date(punchOut)
    if (notes !== undefined) updateData.notes = notes

    const updated = await prisma.attendance.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/attendance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}