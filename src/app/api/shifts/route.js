import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '@/lib/db'

// GET /api/shifts
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shifts = await prisma.shift.findMany({
      orderBy: { startTime: 'asc' }
    })

    return NextResponse.json(shifts)
  } catch (error) {
    console.error('GET /api/shifts error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/shifts
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['admin', 'hr'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, startTime, endTime, breakMinutes, graceMinutes, color } = body

    // Check if code already exists
    const existing = await prisma.shift.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ error: 'Shift code already exists' }, { status: 400 })
    }

    const shift = await prisma.shift.create({
      data: {
        name,
        code: code.toUpperCase(),
        startTime,
        endTime,
        breakMinutes: breakMinutes || 60,
        graceMinutes: graceMinutes || 15,
        color: color || '#3b82f6'
      }
    })

    return NextResponse.json(shift)
  } catch (error) {
    console.error('POST /api/shifts error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}