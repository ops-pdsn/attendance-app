export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/holidays - Get all holidays
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    
    let where = {}
    
    if (year) {
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`)
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`)
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
    console.error('Error fetching holidays:', error)
    return NextResponse.json({ 
      error: error.message,
      details: 'Failed to fetch holidays from database'
    }, { status: 500 })
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
    console.error('Error creating holiday:', error)
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}

// DELETE /api/holidays - Delete all holidays
export async function DELETE() {
  try {
    await prisma.holiday.deleteMany({})
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting holidays:', error)
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}
