import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/attendance - Get attendance records
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 30
    const date = searchParams.get('date')
    
    let where = {}
    if (date) {
      const targetDate = new Date(date)
      targetDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)
      
      where = {
        date: {
          gte: targetDate,
          lt: nextDay
        }
      }
    }
    
    const records = await prisma.attendance.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { session: 'asc' }
      ],
      take: limit
    })
    
    return NextResponse.json(records)
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/attendance - Mark attendance
export async function POST(request) {
  try {
    const body = await request.json()
    const { date, status, session, notes, punchIn, punchOut } = body
    
    if (!date || !status || !session) {
      return NextResponse.json(
        { error: 'Date, status, and session are required' },
        { status: 400 }
      )
    }
    
    // Build attendance data
    const attendanceData = {
      date: new Date(date),
      status,
      session: session || 'full_day',
      notes: notes || ''
    }
    
    // Add punch times if provided
    if (punchIn) {
      attendanceData.punchIn = new Date(punchIn)
    }
    if (punchOut) {
      attendanceData.punchOut = new Date(punchOut)
    }
    
    // Upsert: update if exists for this date+session, create if not
    const attendance = await prisma.attendance.upsert({
      where: { 
        date_session: {
          date: new Date(date),
          session: session || 'full_day'
        }
      },
      update: attendanceData,
      create: attendanceData
    })
    
    return NextResponse.json(attendance, { status: 201 })
  } catch (error) {
    console.error('Error marking attendance:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}