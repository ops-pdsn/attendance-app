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
      accuracy,
      targetUserId // admin can specify userId
    } = body

    // Admin can create for any user
    const isAdmin = ['admin', 'hr'].includes(session.user.role)
    const effectiveUserId = (isAdmin && targetUserId) ? targetUserId : session.user.id

    const attendanceDate = new Date(date)
    attendanceDate.setHours(0, 0, 0, 0)

    // Check if already marked for this date
    const existing = await prisma.attendance.findFirst({
      where: {
        userId: effectiveUserId,
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
        userId: effectiveUserId,
        date: attendanceDate,
        status,
        session: attendanceSession || 'full_day',
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

// PATCH /api/attendance - Admin: update any record (status, session, punchIn, punchOut, notes, userId)
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden — admin/HR only' }, { status: 403 })

    const { id, status, attendanceSession, punchIn, punchOut, notes, userId, date } = await request.json()

    // Admin creating a new record for another user
    if (!id && userId && date) {
      const attendanceDate = new Date(date)
      attendanceDate.setHours(0, 0, 0, 0)
      const record = await prisma.attendance.upsert({
        where: { date_session_userId: { date: attendanceDate, session: attendanceSession || 'full_day', userId } },
        update: { status, notes, punchIn: punchIn ? new Date(punchIn) : undefined, punchOut: punchOut ? new Date(punchOut) : undefined },
        create: { userId, date: attendanceDate, status: status || 'present', session: attendanceSession || 'full_day', notes, punchIn: punchIn ? new Date(punchIn) : null, punchOut: punchOut ? new Date(punchOut) : null }
      })
      return NextResponse.json(record)
    }

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    const existing = await prisma.attendance.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(attendanceSession && { session: attendanceSession }),
        ...(punchIn !== undefined && { punchIn: punchIn ? new Date(punchIn) : null }),
        ...(punchOut !== undefined && { punchOut: punchOut ? new Date(punchOut) : null }),
        ...(notes !== undefined && { notes })
      }
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/attendance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/attendance - Admin: delete any record; user: delete own
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    const existing = await prisma.attendance.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isAdmin = ['admin', 'hr'].includes(session.user.role)
    const isOwner = existing.userId === session.user.id
    if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.attendance.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/attendance error:', error)
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