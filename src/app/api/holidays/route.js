import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/holidays - Get all holidays
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    
    let where = {}
    
    if (year) {
      const startDate = new Date(`${year}-01-01`)
      const endDate = new Date(`${year}-12-31`)
      where = {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    }
    
    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' }
    })
    
    return NextResponse.json(holidays)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/holidays - Create a holiday
export async function POST(request) {
  try {
    const body = await request.json()
    const { name, date, type, description } = body
    
    if (!name || !date) {
      return NextResponse.json(
        { error: 'Name and date are required' },
        { status: 400 }
      )
    }
    
    const holiday = await prisma.holiday.create({
      data: {
        name,
        date: new Date(date),
        type: type || 'public',
        description: description || ''
      }
    })
    
    return NextResponse.json(holiday, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/holidays - Delete all holidays (for bulk operations)
export async function DELETE() {
  try {
    await prisma.holiday.deleteMany({})
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}