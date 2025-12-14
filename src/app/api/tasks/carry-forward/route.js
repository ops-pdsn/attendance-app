import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

// POST /api/tasks/carry-forward - Carry forward incomplete tasks for logged-in user
export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fromDate, toDate } = body
    
    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'fromDate and toDate are required' },
        { status: 400 }
      )
    }
    
    const from = new Date(fromDate)
    from.setHours(0, 0, 0, 0)
    
    const to = new Date(toDate)
    to.setHours(23, 59, 59, 999)
    
    // Only get incomplete tasks belonging to this user
    const incompleteTasks = await prisma.task.findMany({
      where: {
        userId: session.user.id,  // Only this user's tasks
        date: {
          gte: from,
          lte: to
        },
        completed: false
      }
    })
    
    if (incompleteTasks.length === 0) {
      return NextResponse.json({ 
        message: 'No incomplete tasks to carry forward',
        carriedForward: 0 
      })
    }
    
    const nextDate = new Date(toDate)
    nextDate.setDate(nextDate.getDate() + 1)
    
    // Create new tasks linked to this user
    const carriedTasks = await Promise.all(
      incompleteTasks.map(task =>
        prisma.task.create({
          data: {
            title: task.title,
            date: nextDate,
            type: task.type,
            priority: task.priority,
            notes: task.notes ? `[Carried forward] ${task.notes}` : '[Carried forward from previous day]',
            completed: false,
            userId: session.user.id  // Link to logged-in user
          }
        })
      )
    )
    
    return NextResponse.json({ 
      message: `${carriedTasks.length} tasks carried forward`,
      carriedForward: carriedTasks.length,
      tasks: carriedTasks
    })
  } catch (error) {
    console.error('POST /api/tasks/carry-forward error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}