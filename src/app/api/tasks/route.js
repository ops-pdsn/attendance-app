import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

// GET /api/tasks - Get all tasks for logged-in user
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const assignedTo = searchParams.get('assignedTo') // For managers to view team tasks

    // Build where clause
    let where = {}

    if (assignedTo && ['admin', 'hr', 'manager'].includes(session.user.role)) {
      where.OR = [{ userId: assignedTo }, { assignedToId: assignedTo }]
    } else {
      // Show tasks owned by user OR assigned to user
      where.OR = [{ userId: session.user.id }, { assignedToId: session.user.id }]
    }

    if (type) where.type = type

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z')
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } }
      },
      orderBy: { date: 'asc' }
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('GET /api/tasks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/tasks - Create a new task
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, date, type, priority, notes, assignedTo, categoryId, subCategoryId } = body

    if (!title || !date || !type) {
      return NextResponse.json(
        { error: 'Title, date, and type are required' },
        { status: 400 }
      )
    }

    // Determine who the task is for
    let taskUserId = session.user.id

    // Admin/HR/Manager can assign tasks to others
    if (assignedTo && ['admin', 'hr', 'manager'].includes(session.user.role)) {
      // Verify user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: assignedTo },
        select: { id: true, name: true }
      })

      if (!targetUser) {
        return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 })
      }

      taskUserId = assignedTo
    }

    // Create task — if assigned to someone else, owner is the creator and assignedTo is the target
    const isAssignedToOther = assignedTo && assignedTo !== session.user.id
    const task = await prisma.task.create({
      data: {
        title,
        date: new Date(date),
        type,
        priority: priority || 'medium',
        notes: notes || '',
        userId: isAssignedToOther ? session.user.id : taskUserId,
        assignedToId: isAssignedToOther ? assignedTo : null,
        ...(categoryId && { categoryId }),
        ...(subCategoryId && { subCategoryId })
      }
    })

    // ✅ NOTIFICATION: If task is assigned to someone else, notify them
    if (assignedTo && assignedTo !== session.user.id) {
      const dueDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })

      const priorityEmoji = {
        high: '🔴',
        medium: '🟡',
        low: '🟢'
      }[priority || 'medium']

      await prisma.notification.create({
        data: {
          userId: assignedTo,
          title: '📋 New Task Assigned',
          message: `${priorityEmoji} "${title}" - Due: ${dueDate} (assigned by ${session.user.name})`,
          type: 'task',
          link: '/tasks'
        }
      })
    }

    // ✅ NOTIFICATION: If high priority task, send additional alert
    if (priority === 'high') {
      const dueDate = new Date(date)
      const today = new Date()
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))

      if (daysUntilDue <= 2 && taskUserId !== session.user.id) {
        await prisma.notification.create({
          data: {
            userId: taskUserId,
            title: '⚠️ Urgent Task',
            message: `High priority task "${title}" is due ${daysUntilDue <= 0 ? 'today' : `in ${daysUntilDue} day(s)`}!`,
            type: 'warning',
            link: '/tasks'
          }
        })
      }
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('POST /api/tasks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/tasks - Update task (for marking complete, etc.)
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, completed, title, date, type, priority, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    // Get existing task
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } } }
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check permission
    const isOwner = existingTask.userId === session.user.id
    const isAdmin = ['admin', 'hr', 'manager'].includes(session.user.role)

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build update data
    const updateData = {}
    if (completed !== undefined) updateData.completed = completed
    if (title) updateData.title = title
    if (date) updateData.date = new Date(date)
    if (type) updateData.type = type
    if (priority) updateData.priority = priority
    if (notes !== undefined) updateData.notes = notes

    // Update task
    const task = await prisma.task.update({
      where: { id },
      data: updateData
    })

    // ✅ NOTIFICATION: If task marked complete by manager, notify owner
    if (completed === true && !isOwner && isAdmin) {
      await prisma.notification.create({
        data: {
          userId: existingTask.userId,
          title: '✅ Task Completed',
          message: `Your task "${existingTask.title}" was marked as complete by ${session.user.name}`,
          type: 'success',
          link: '/tasks'
        }
      })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('PATCH /api/tasks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}