import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// DELETE /api/holidays/[id] - Delete a holiday
export async function DELETE(request, { params }) {
  try {
    const { id } = params
    
    await prisma.holiday.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/holidays/[id] - Update a holiday
export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    
    const holiday = await prisma.holiday.update({
      where: { id },
      data: body
    })
    
    return NextResponse.json(holiday)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}