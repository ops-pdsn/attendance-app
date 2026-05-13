import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const isAdmin = ['admin', 'hr', 'manager'].includes(session.user.role)

    const where = isAdmin ? {} : { userId: session.user.id }
    if (status) where.status = status

    const requests = await prisma.overtimeRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, department: true, employeeId: true } },
        approver: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Also get comp-off balance for current user
    const year = new Date().getFullYear()
    const compOff = await prisma.compOffBalance.findUnique({
      where: { userId_year: { userId: session.user.id, year } }
    })

    return NextResponse.json({ requests, compOff: compOff || { earned: 0, used: 0 } })
  } catch (error) {
    console.error('GET /api/overtime error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date, hours, reason } = await request.json()
    if (!date || !hours || !reason) {
      return NextResponse.json({ error: 'Date, hours, and reason are required' }, { status: 400 })
    }
    if (hours <= 0 || hours > 12) {
      return NextResponse.json({ error: 'Overtime hours must be between 0 and 12' }, { status: 400 })
    }

    const ot = await prisma.overtimeRequest.create({
      data: { userId: session.user.id, date: new Date(date), hours: parseFloat(hours), reason }
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
          title: 'Overtime Request',
          message: `${session.user.name || session.user.email} submitted an overtime request for ${parseFloat(hours)}h on ${new Date(date).toLocaleDateString()}`,
          type: 'info',
          link: '/overtime'
        }))
      })
    }

    return NextResponse.json(ot, { status: 201 })
  } catch (error) {
    console.error('POST /api/overtime error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
