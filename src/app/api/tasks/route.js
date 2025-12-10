export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '@/lib/db'

// GET /api/tasks - Get all tasks for logged-in user
export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    // existing filter
    const type = searchParams.get('type')

    // ⭐ new date-range filters
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    // Always filter by logged-in user
    let where = { 
  userId: session.user.id,
  ...(type && { type })
}


    // ⭐ apply date range if provided
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z')
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      // you can keep 'asc' or change to 'desc' if you prefer latest first
      orderBy: { date: 'asc' }
    })
    
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('GET /api/tasks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


// POST /api/tasks - Create a new task for logged-in user
export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, date, type, priority, notes } = body
    
    if (!title || !date || !type) {
      return NextResponse.json(
        { error: 'Title, date, and type are required' },
        { status: 400 }
      )
    }
    
    // Create task linked to the logged-in user
    const task = await prisma.task.create({
      data: {
        title,
        date: new Date(date),
        type,
        priority: priority || 'medium',
        notes: notes || '',
        userId: session.user.id  // Link to logged-in user
      }
    })
    
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('POST /api/tasks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
