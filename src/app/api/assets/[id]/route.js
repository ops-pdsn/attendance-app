import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { action, userId, ...fields } = body

    const asset = await prisma.asset.findUnique({ where: { id: params.id } })
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let data = {}

    if (action === 'assign') {
      if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
      data = { assignedTo: userId, assignedAt: new Date(), status: 'assigned' }
    } else if (action === 'unassign') {
      data = { assignedTo: null, assignedAt: null, status: 'available' }
    } else if (action === 'maintenance') {
      data = { status: 'maintenance' }
    } else if (action === 'retire') {
      data = { status: 'retired', assignedTo: null }
    } else {
      // Generic update
      const allowed = ['name', 'brand', 'model', 'serialNo', 'condition', 'notes', 'purchaseDate', 'purchasePrice']
      for (const key of allowed) {
        if (fields[key] !== undefined) data[key] = fields[key]
      }
      if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate)
      if (data.purchasePrice) data.purchasePrice = parseFloat(data.purchasePrice)
    }

    const updated = await prisma.asset.update({
      where: { id: params.id },
      data,
      include: { assignee: { select: { id: true, name: true, employeeId: true } } },
    })
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const asset = await prisma.asset.findUnique({ where: { id: params.id } })
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (asset.status === 'assigned')
      return NextResponse.json({ error: 'Unassign asset before deleting' }, { status: 400 })

    await prisma.asset.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
