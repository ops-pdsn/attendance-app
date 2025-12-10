export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '@/lib/db'

// GET /api/notifications - Get user's notifications
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 20
    const unreadOnly = searchParams.get('unread') === 'true'

    const where = { userId: session.user.id }
    if (unreadOnly) {
      where.isRead = false
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false }
      })
    ])

    return NextResponse.json({
      notifications,
      unreadCount
    })
  } catch (error) {
    console.error('GET /api/notifications error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/notifications - Create notification (internal use / admin)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, title, message, type, link } = body

    // Only admin/hr can create notifications for others
    if (userId && userId !== session.user.id) {
      if (session.user.role !== 'admin' && session.user.role !== 'hr') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const notification = await prisma.notification.create({
      data: {
        userId: userId || session.user.id,
        title,
        message,
        type: type || 'info',
        link
      }
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('POST /api/notifications error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/notifications - Mark all as read
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'markAllRead') {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true }
      })

      return NextResponse.json({ success: true, message: 'All notifications marked as read' })
    }

    if (action === 'deleteAll') {
      await prisma.notification.deleteMany({
        where: { userId: session.user.id }
      })

      return NextResponse.json({ success: true, message: 'All notifications deleted' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('PATCH /api/notifications error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
