import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '@/lib/db'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['admin', 'hr'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') // Format: YYYY-MM

    // Parse month
    const [year, month] = monthParam 
      ? monthParam.split('-').map(Number)
      : [new Date().getFullYear(), new Date().getMonth() + 1]

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    // Get all users
    const users = await prisma.user.findMany({
      where: { role: { not: 'admin' } },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        department: true
      }
    })

    // Get attendance for the month
    const attendance = await prisma.attendance.findMany({
      where: {
        date: { gte: startDate, lte: endDate }
      }
    })

    // Calculate payroll data for each user
    const payrollData = users.map(user => {
      const userAttendance = attendance.filter(a => a.userId === user.id)
      
      let totalHours = 0
      let lateArrivals = 0

      userAttendance.forEach(a => {
        // Calculate hours
        if (a.punchIn && a.punchOut) {
          const hours = (new Date(a.punchOut) - new Date(a.punchIn)) / (1000 * 60 * 60)
          if (hours > 0 && hours < 24) {
            totalHours += hours
          }
        }

        // Check for late arrival (after 9:30 AM)
        if (a.punchIn) {
          const punchIn = new Date(a.punchIn)
          if (punchIn.getHours() > 9 || (punchIn.getHours() === 9 && punchIn.getMinutes() > 30)) {
            lateArrivals++
          }
        }
      })

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        department: user.department,
        daysPresent: userAttendance.length,
        totalHours: parseFloat(totalHours.toFixed(2)),
        lateArrivals,
        hourlyRate: 0 // Can be fetched from user profile if stored
      }
    })

    return NextResponse.json(payrollData)
  } catch (error) {
    console.error('GET /api/payroll error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}