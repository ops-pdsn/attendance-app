import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const claim = await prisma.expenseClaim.findUnique({
      where: { id: params.id },
      include: {
        user:     { select: { id: true, name: true, employeeId: true, department: true } },
        approver: { select: { id: true, name: true } },
      },
    })
    if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = claim.userId === session.user.id
    const isPrivileged = ['admin', 'hr', 'manager'].includes(session.user.role)
    if (!isOwner && !isPrivileged)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json(claim)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { action, rejectionReason, ...editFields } = body

    const claim = await prisma.expenseClaim.findUnique({ where: { id: params.id } })
    if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = claim.userId === session.user.id
    const isPrivileged = ['admin', 'hr', 'manager'].includes(session.user.role)

    let data = {}

    if (action === 'approve' && isPrivileged) {
      data = { status: 'approved', approverId: session.user.id, approvedAt: new Date() }
    } else if (action === 'reject' && isPrivileged) {
      data = { status: 'rejected', approverId: session.user.id, approvedAt: new Date(), rejectionReason: rejectionReason || null }
    } else if (action === 'pay' && ['admin', 'hr'].includes(session.user.role)) {
      data = { status: 'paid', paidAt: new Date() }
    } else if (isOwner && claim.status === 'pending') {
      // Owner can edit pending claims
      const { title, category, amount, date, description, receiptUrl } = editFields
      if (title)       data.title       = title
      if (category)    data.category    = category
      if (amount)      data.amount      = parseFloat(amount)
      if (date)        data.date        = new Date(date)
      if (description !== undefined) data.description = description
      if (receiptUrl  !== undefined) data.receiptUrl  = receiptUrl
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.expenseClaim.update({ where: { id: params.id }, data })
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const claim = await prisma.expenseClaim.findUnique({ where: { id: params.id } })
    if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = claim.userId === session.user.id
    const isAdmin = ['admin', 'hr'].includes(session.user.role)
    if (!isOwner && !isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (isOwner && claim.status !== 'pending')
      return NextResponse.json({ error: 'Cannot delete a processed claim' }, { status: 400 })

    await prisma.expenseClaim.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
