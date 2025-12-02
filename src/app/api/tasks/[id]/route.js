import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// PATCH /api/tasks/[id] - Update a task
export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    
    const task = await prisma.task.update({
      where: { id },
      data: body
    })
    
    return NextResponse.json(task)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(request, { params }) {
  try {
    const { id } = params
    
    await prisma.task.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}