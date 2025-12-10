import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/admin/stats - Get dashboard statistics (Admin/HR only)
export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or HR
    if (session.user.role !== 'admin' && session.user.role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get date range from query params
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Build date filter
    let dateFilter = {}
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam)
      startDate.setHours(0, 0, 0, 0)
      
      const endDate = new Date(endDateParam)
      endDate.setHours(23, 59, 59, 999)
      
      dateFilter = {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    }

    // Simple counts
    const totalUsers = await prisma.user.count()
    
    // Tasks with optional date filter
    const totalTasks = await prisma.task.count({
      where: dateFilter.date ? { date: dateFilter.date } : {}
    })
    
    const completedTasks = await prisma.task.count({ 
      where: { 
        completed: true,
        ...(dateFilter.date && { date: dateFilter.date })
      } 
    })
    
    // Today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Today's attendance count
    const todayAttendance = await prisma.attendance.count({
      where: {
        date: { gte: today, lt: tomorrow }
      }
    })

    // Total attendance in date range
    const totalAttendance = await prisma.attendance.count({
      where: dateFilter.date ? { date: dateFilter.date } : {}
    })

    // Attendance by status in date range
    const officeCount = await prisma.attendance.count({
      where: { 
        status: 'office',
        ...(dateFilter.date && { date: dateFilter.date })
      }
    })
    
    const fieldCount = await prisma.attendance.count({
      where: { 
        status: 'field',
        ...(dateFilter.date && { date: dateFilter.date })
      }
    })

    // Calculate completion rate
    const completionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0

    return NextResponse.json({
      period: {
        start: startDateParam || 'all',
        end: endDateParam || 'all'
      },
      users: {
        total: totalUsers
      },
      attendance: {
        today: {
          total: todayAttendance
        },
        total: totalAttendance,
        office: officeCount,
        field: fieldCount
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        completionRate: completionRate
      }
    })
  } catch (error) {
    console.error('GET /api/admin/stats error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}