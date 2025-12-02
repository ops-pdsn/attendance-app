import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// POST /api/tasks/carry-forward - Carry forward incomplete tasks
export async function POST(request) {
  try {
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
    
    // Find incomplete tasks from the specified date
    const incompleteTasks = await prisma.task.findMany({
      where: {
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
    
    // Create new tasks for the next day
    const nextDate = new Date(toDate)
    nextDate.setDate(nextDate.getDate() + 1)
    
    const carriedTasks = await Promise.all(
      incompleteTasks.map(task =>
        prisma.task.create({
          data: {
            title: task.title,
            date: nextDate,
            type: task.type,
            priority: task.priority,
            notes: task.notes ? `[Carried forward] ${task.notes}` : '[Carried forward from previous day]',
            completed: false
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}