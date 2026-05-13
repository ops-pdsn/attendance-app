import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { targetRole: 'all' },
          { targetRole: session.user.role }
        ],
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
        ]
      },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }]
    })

    return NextResponse.json(announcements)
  } catch (error) {
    console.error('GET /api/announcements error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['admin', 'hr'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, content, type, targetRole, isPinned, expiresAt } = await request.json()
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type: type || 'info',
        targetRole: targetRole || 'all',
        isPinned: isPinned || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        authorId: session.user.id
      },
      include: { author: { select: { id: true, name: true, role: true } } }
    })

    // Create notifications for all relevant users
    const targetUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(targetRole && targetRole !== 'all' ? { role: targetRole } : {})
      },
      select: { id: true }
    })

    if (targetUsers.length) {
      await prisma.notification.createMany({
        data: targetUsers.map(u => ({
          userId: u.id,
          title: `📢 ${title}`,
          message: content.length > 100 ? content.substring(0, 97) + '...' : content,
          type: type === 'urgent' ? 'warning' : 'info',
          link: '/announcements'
        }))
      })
    }

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('POST /api/announcements error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
