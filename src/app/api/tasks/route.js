import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/tasks - Get all tasks
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // "daily" or "upcoming"
    
    const where = type ? { type } : {}
    
    const tasks = await prisma.task.findMany({
      where,
      orderBy: { date: 'asc' }
    })
    
    return NextResponse.json(tasks)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/tasks - Create a new task
export async function POST(request) {
  try {
    const body = await request.json()
    const { title, date, type, priority, notes } = body
    
    if (!title || !date || !type) {
      return NextResponse.json(
        { error: 'Title, date, and type are required' },
        { status: 400 }
      )
    }
    
    const task = await prisma.task.create({
      data: {
        title,
        date: new Date(date),
        type,
        priority: priority || 'medium', // Add priority field with fallback
        notes: notes || ''
      }
    })
    
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}