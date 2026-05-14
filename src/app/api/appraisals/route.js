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
    const view   = searchParams.get('view') || 'mine'
    const period = searchParams.get('period')
    const status = searchParams.get('status')

    const isPrivileged = ['admin', 'hr'].includes(session.user.role)

    let where = {}
    if (view === 'mine') {
      where.userId = session.user.id
    } else if (view === 'team' && session.user.role === 'manager') {
      // Manager sees their subordinates' appraisals
      const subordinates = await prisma.user.findMany({
        where: { managerId: session.user.id },
        select: { id: true },
      })
      where.userId = { in: subordinates.map(u => u.id) }
    } else if (!isPrivileged) {
      where.userId = session.user.id
    }

    if (period) where.period = period
    if (status) where.status = status

    const appraisals = await prisma.appraisal.findMany({
      where,
      include: {
        user:     { select: { id: true, name: true, employeeId: true, department: true } },
        reviewer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(appraisals)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { userIds, period, periodStart, periodEnd, reviewerId } = body

    if (!userIds?.length || !period || !periodStart || !periodEnd)
      return NextResponse.json({ error: 'userIds, period, periodStart, periodEnd required' }, { status: 400 })

    const created = await prisma.$transaction(
      userIds.map(uid =>
        prisma.appraisal.upsert({
          where:  { userId_period: { userId: uid, period } },
          update: { reviewerId: reviewerId || null },
          create: {
            userId:      uid,
            period,
            periodStart: new Date(periodStart),
            periodEnd:   new Date(periodEnd),
            reviewerId:  reviewerId || null,
          },
        })
      )
    )

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
