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

    // Deactivate existing active assignments for this user
    await prisma.userShift.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, endDate: new Date() }
    })

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
        user: { select: { name: true } },
        shift: true
      }
    })

    return NextResponse.json(assignment)
  } catch (error) {
    console.error('POST /api/shifts/assignments error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}