import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/attendance - Get attendance records
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 30
    
    const records = await prisma.attendance.findMany({
      orderBy: { date: 'desc' },
      take: limit
    })
    
    return NextResponse.json(records)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/attendance - Mark attendance
export async function POST(request) {
  try {
    const body = await request.json()
    const { date, status, notes, punchIn, punchOut } = body
    
    if (!date || !status) {
      return NextResponse.json(
        { error: 'Date and status are required' },
        { status: 400 }
      )
    }
    
    // Build attendance data
    const attendanceData = {
      date: new Date(date),
      status,
      notes: notes || ''
    }
    
    // Add punch times if provided
    if (punchIn) {
      attendanceData.punchIn = new Date(punchIn)
    }
    if (punchOut) {
      attendanceData.punchOut = new Date(punchOut)
    }
    
    // Upsert: update if exists for this date, create if not
    const attendance = await prisma.attendance.upsert({
      where: { date: new Date(date) },
      update: attendanceData,
      create: attendanceData
    })
    
    return NextResponse.json(attendance, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}