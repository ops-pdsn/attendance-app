import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doc = await prisma.document.findUnique({ where: { id: params.id } })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isAdmin = ['admin', 'hr'].includes(session.user.role)
    const isOwner = doc.userId === session.user.id || doc.uploadedBy === session.user.id
    if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.document.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
