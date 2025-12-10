import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        isActive: true,
        _count: { select: { subordinates: true } }
      },
      orderBy: { name: 'asc' }
    })

    // Build tree
    const userMap = new Map()
    const roots = []

    users.forEach(user => {
      userMap.set(user.id, { ...user, children: [] })
    })

    users.forEach(user => {
      const node = userMap.get(user.id)
      if (user.managerId && userMap.has(user.managerId)) {
        userMap.get(user.managerId).children.push(node)
      } else {
        roots.push(node)
      }
    })

    return NextResponse.json({
      tree: roots,
      flatList: users,
      stats: {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        managers: users.filter(u => u._count.subordinates > 0).length
      }
    })
  } catch (error) {
    console.error('GET /api/org-tree error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'hr')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, managerId } = await request.json()

    if (userId === managerId) {
      return NextResponse.json({ error: 'User cannot be their own manager' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { managerId: managerId || null },
      select: { name: true, manager: { select: { name: true } } }
    })

    return NextResponse.json({
      success: true,
      message: managerId ? `${updated.name} now reports to ${updated.manager?.name}` : `${updated.name} is now top-level`
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}