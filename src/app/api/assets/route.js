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
    const view     = searchParams.get('view') || 'all'
    const status   = searchParams.get('status')
    const category = searchParams.get('category')

    const isPrivileged = ['admin', 'hr'].includes(session.user.role)

    const where = {}
    if (!isPrivileged || view === 'mine') where.assignedTo = session.user.id
    if (status)   where.status   = status
    if (category) where.category = category

    const assets = await prisma.asset.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, employeeId: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const stats = isPrivileged ? await prisma.asset.groupBy({
      by: ['status'],
      _count: { _all: true },
    }) : null

    return NextResponse.json({ assets, stats })
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
    const { name, assetCode, category, brand, model, serialNo, purchaseDate, purchasePrice, condition, notes } = body

    if (!name || !assetCode || !category)
      return NextResponse.json({ error: 'name, assetCode, category required' }, { status: 400 })

    const asset = await prisma.asset.create({
      data: {
        name,
        assetCode,
        category,
        brand:         brand         || null,
        model:         model         || null,
        serialNo:      serialNo      || null,
        purchaseDate:  purchaseDate  ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        condition:     condition     || 'good',
        notes:         notes         || null,
      },
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
