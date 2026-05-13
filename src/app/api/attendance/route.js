import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// Parse any date input as UTC midnight — fixes timezone shift bug
function parseDateUTC(dateInput) {
  if (!dateInput) return null
  const dateOnly = String(dateInput).split('T')[0]
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

// GET /api/attendance
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const userId = searchParams.get('userId')

    let where = {}

    if (session.user.role === 'admin' || session.user.role === 'hr') {
      if (userId) where.userId = userId
    } else {
      where.userId = session.user.id
    }

    if (startDate && endDate) {
      const endUTC = parseDateUTC(endDate)
      endUTC.setUTCHours(23, 59, 59, 999)
      where.date = {
        gte: parseDateUTC(startDate),
        lte: endUTC
      }
    }

    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, department: true }
        }
      }
    })

    return NextResponse.json(attendance)
  } catch (error) {
    console.error('GET /api/attendance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/attendance
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { date, status, session: attendanceSession, notes, latitude, longitude, location, accuracy, photo, targetUserId } = body

    const isAdmin = ['admin', 'hr'].includes(session.user.role)
    const effectiveUserId = (isAdmin && targetUserId) ? targetUserId : session.user.id

    // Use UTC-safe date parsing to avoid timezone day-shift
    const attendanceDate = parseDateUTC(date)

    const existing = await prisma.attendance.findFirst({
      where: { userId: effectiveUserId, date: attendanceDate }
    })

    if (existing) {
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status,
          session: attendanceSession,
          notes,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          location,
          photo: photo || existing.photo,
          punchIn: existing.punchIn || new Date(),
          punchOut: new Date()
        }
      })
      return NextResponse.json(updated)
    }

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
        photo: photo || null,
        punchIn: new Date()
      }
    })

    return NextResponse.json(attendance, { status: 201 })
  } catch (error) {
    console.error('POST /api/attendance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/attendance — Admin update
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, status, attendanceSession, punchIn, punchOut, notes, userId, date } = await request.json()

    if (!id && userId && date) {
      const attendanceDate = parseDateUTC(date)
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

// DELETE /api/attendance
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

// PUT /api/attendance — Edit times
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, punchIn, punchOut, notes } = await request.json()
    const attendance = await prisma.attendance.findUnique({ where: { id } })

    if (!attendance) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (attendance.userId !== session.user.id && session.user.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        ...(punchIn && { punchIn: new Date(punchIn) }),
        ...(punchOut && { punchOut: new Date(punchOut) }),
        ...(notes !== undefined && { notes })
      }
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/attendance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
