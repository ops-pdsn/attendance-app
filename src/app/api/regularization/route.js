import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/regularization
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const isAdmin = ['admin', 'hr', 'manager'].includes(session.user.role)

    const where = {}
    if (!isAdmin) {
      where.userId = session.user.id
    } else if (userId) {
      where.userId = userId
    }
    if (status) where.status = status

    const requests = await prisma.attendanceRegularization.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, department: true, employeeId: true } },
        reviewer: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('GET /api/regularization error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/regularization
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { date, reason, requestedStatus, requestedPunchIn, requestedPunchOut, requestedSession } = body

    if (!date || !reason || !requestedStatus) {
      return NextResponse.json({ error: 'Date, reason, and requested status are required' }, { status: 400 })
    }

    // Check for duplicate pending request for same date
    const existing = await prisma.attendanceRegularization.findFirst({
      where: { userId: session.user.id, date: new Date(date), status: 'pending' }
    })
    if (existing) {
      return NextResponse.json({ error: 'A pending regularization request already exists for this date' }, { status: 409 })
    }

    const reg = await prisma.attendanceRegularization.create({
      data: {
        userId: session.user.id,
        date: new Date(date),
        reason,
        requestedStatus,
        requestedPunchIn: requestedPunchIn ? new Date(requestedPunchIn) : null,
        requestedPunchOut: requestedPunchOut ? new Date(requestedPunchOut) : null,
        requestedSession: requestedSession || 'full_day'
      }
    })

    // Notify managers/HR
    const managers = await prisma.user.findMany({
      where: { role: { in: ['admin', 'hr', 'manager'] }, isActive: true },
      select: { id: true }
    })
    if (managers.length) {
      await prisma.notification.createMany({
        data: managers.map(m => ({
          userId: m.id,
          title: 'Regularization Request',
          message: `${session.user.name || session.user.email} has submitted an attendance regularization request for ${new Date(date).toLocaleDateString()}`,
          type: 'info',
          link: '/regularization'
        }))
      })
    }

    return NextResponse.json(reg, { status: 201 })
  } catch (error) {
    console.error('POST /api/regularization error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
