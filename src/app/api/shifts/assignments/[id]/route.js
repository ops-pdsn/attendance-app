import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// DELETE /api/shifts/assignments/[id]
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['admin', 'hr'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = params

    await prisma.userShift.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/shifts/assignments error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}