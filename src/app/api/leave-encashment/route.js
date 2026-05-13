import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = ['admin', 'hr'].includes(session.user.role)
    const where = isAdmin ? {} : { userId: session.user.id }

    const encashments = await prisma.leaveEncashment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, department: true, basicSalary: true } },
        leaveType: { select: { id: true, name: true, code: true } },
        approver: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(encashments)
  } catch (error) {
    console.error('GET /api/leave-encashment error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { leaveTypeId, days, reason } = await request.json()
    if (!leaveTypeId || !days) {
      return NextResponse.json({ error: 'Leave type and days are required' }, { status: 400 })
    }

    const year = new Date().getFullYear()

    // Check leave balance
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_leaveTypeId_year: { userId: session.user.id, leaveTypeId, year } },
      include: { leaveType: true }
    })
    if (!balance) return NextResponse.json({ error: 'No leave balance found for this leave type' }, { status: 400 })
    if (!balance.leaveType.carryForward) {
      return NextResponse.json({ error: 'This leave type is not eligible for encashment' }, { status: 400 })
    }

    const available = balance.total - balance.used - balance.pending
    if (days > available) {
      return NextResponse.json({ error: `Only ${available} days available for encashment` }, { status: 400 })
    }

    // Calculate amount based on basic salary
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { basicSalary: true } })
    const dailyRate = user?.basicSalary ? user.basicSalary / 26 : null
    const amount = dailyRate ? dailyRate * days : null

    const encashment = await prisma.leaveEncashment.create({
      data: {
        userId: session.user.id,
        leaveTypeId,
        year,
        days: parseFloat(days),
        amount,
        reason
      }
    })

    // Notify HR/Admin
    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin', 'hr'] }, isActive: true },
      select: { id: true }
    })
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map(a => ({
          userId: a.id,
          title: 'Leave Encashment Request',
          message: `${session.user.name || session.user.email} has requested encashment of ${days} leave days.`,
          type: 'info',
          link: '/leave?tab=encashment'
        }))
      })
    }

    return NextResponse.json(encashment, { status: 201 })
  } catch (error) {
    console.error('POST /api/leave-encashment error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
