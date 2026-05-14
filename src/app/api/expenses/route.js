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
    const view    = searchParams.get('view') || 'mine'
    const status  = searchParams.get('status')
    const page    = parseInt(searchParams.get('page') || '1')
    const limit   = parseInt(searchParams.get('limit') || '20')
    const skip    = (page - 1) * limit

    const isPrivileged = ['admin', 'hr', 'manager'].includes(session.user.role)

    const where = {}
    if (view === 'mine' || !isPrivileged) {
      where.userId = session.user.id
    }
    if (status) where.status = status

    const [claims, total] = await Promise.all([
      prisma.expenseClaim.findMany({
        where,
        include: {
          user:     { select: { id: true, name: true, employeeId: true, department: true } },
          approver: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expenseClaim.count({ where }),
    ])

    // Summary stats
    const stats = await prisma.expenseClaim.groupBy({
      by: ['status'],
      where: view === 'mine' || !isPrivileged ? { userId: session.user.id } : {},
      _count: { _all: true },
      _sum:   { amount: true },
    })

    return NextResponse.json({ claims, total, page, limit, stats })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, category, amount, date, description, receiptUrl, currency } = body

    if (!title || !category || !amount || !date)
      return NextResponse.json({ error: 'title, category, amount, date required' }, { status: 400 })

    const claim = await prisma.expenseClaim.create({
      data: {
        title,
        category,
        amount:     parseFloat(amount),
        currency:   currency || 'INR',
        date:       new Date(date),
        description: description || null,
        receiptUrl:  receiptUrl  || null,
        userId:      session.user.id,
      },
    })

    return NextResponse.json(claim, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
