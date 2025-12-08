import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '@/lib/db'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const team = searchParams.get('team') === 'true'

    let where = {}

    // If requesting team data
    if (team) {
      if (!['admin', 'hr', 'manager'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Manager sees only their team
      if (session.user.role === 'manager') {
        where = {
          OR: [
            { department: session.user.department },
            { managerId: session.user.id }
          ]
        }
      }
      // Admin/HR sees everyone
    } else {
      // Regular users can only see themselves
      if (session.user.role !== 'admin' && session.user.role !== 'hr') {
        where.id = session.user.id
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        role: true,
        employeeId: true,
        phone: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('GET /api/users error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}