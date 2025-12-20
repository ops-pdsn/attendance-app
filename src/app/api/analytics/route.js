import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role
    if (!['admin', 'hr', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || 'month'

    // Calculate date range
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    
    let startDate = new Date()
    switch (range) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setDate(startDate.getDate() - 30)
        break
      case 'quarter':
        startDate.setDate(startDate.getDate() - 90)
        break
      case 'year':
        startDate.setDate(startDate.getDate() - 365)
        break
      default:
        startDate.setDate(startDate.getDate() - 30)
    }
    startDate.setHours(0, 0, 0, 0)

    // Get total employees
    const totalEmployees = await prisma.user.count({
      where: { isActive: true }
    })

    // Get attendance records in date range
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: today
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            department: true
          }
        }
      },
      orderBy: { date: 'asc' }
    })

    // Calculate attendance trend (group by date)
    const trendMap = {}
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0]
      if (!trendMap[dateKey]) {
        trendMap[dateKey] = { date: dateKey, office: 0, field: 0, leave: 0 }
      }
      if (record.status === 'office') trendMap[dateKey].office++
      else if (record.status === 'field') trendMap[dateKey].field++
      else if (record.status === 'leave') trendMap[dateKey].leave++
    })

    const attendanceTrend = Object.values(trendMap)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-7) // Last 7 data points
      .map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }))

    // Department breakdown
    const departmentMap = {}
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, department: true }
    })

    users.forEach(user => {
      const dept = user.department || 'Unassigned'
      if (!departmentMap[dept]) {
        departmentMap[dept] = { name: dept, value: 0, presentDays: 0, totalDays: 0 }
      }
      departmentMap[dept].value++
    })

    // Calculate department attendance rates
    attendanceRecords.forEach(record => {
      const dept = record.user?.department || 'Unassigned'
      if (departmentMap[dept]) {
        departmentMap[dept].totalDays++
        if (record.status === 'office' || record.status === 'field') {
          departmentMap[dept].presentDays++
        }
      }
    })

    const departmentBreakdown = Object.values(departmentMap).map(dept => ({
      name: dept.name,
      value: dept.value,
      attendance: dept.totalDays > 0 
        ? Math.round((dept.presentDays / dept.totalDays) * 100) 
        : 0
    }))

    // Leave statistics
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: today
        }
      },
      include: {
        leaveType: true
      }
    })

    const leaveTypeMap = {}
    leaveRequests.forEach(req => {
      const typeName = req.leaveType?.name || 'Other'
      if (!leaveTypeMap[typeName]) {
        leaveTypeMap[typeName] = { name: typeName, value: 0 }
      }
      leaveTypeMap[typeName].value++
    })

    const leaveTypes = Object.values(leaveTypeMap)
    if (leaveTypes.length === 0) {
      // Add placeholder data if no leaves
      leaveTypes.push(
        { name: 'Casual Leave', value: 0 },
        { name: 'Sick Leave', value: 0 },
        { name: 'Earned Leave', value: 0 }
      )
    }

    // Calculate averages
    const totalAttendance = attendanceRecords.filter(
      r => r.status === 'office' || r.status === 'field'
    ).length
    
    const workingDays = [...new Set(attendanceRecords.map(r => r.date.toISOString().split('T')[0]))].length
    
    const avgAttendanceRate = workingDays > 0 && totalEmployees > 0
      ? Math.round((totalAttendance / (workingDays * totalEmployees)) * 100)
      : 0

    // Calculate average hours worked
    let totalHours = 0
    let hoursCount = 0
    attendanceRecords.forEach(record => {
      if (record.punchIn && record.punchOut) {
        const hours = (new Date(record.punchOut) - new Date(record.punchIn)) / (1000 * 60 * 60)
        if (hours > 0 && hours < 24) {
          totalHours += hours
          hoursCount++
        }
      }
    })
    const avgHoursWorked = hoursCount > 0 ? (totalHours / hoursCount).toFixed(1) : 8

    // Late arrivals (after 9:30 AM)
    const lateArrivals = attendanceRecords.filter(record => {
      if (!record.punchIn) return false
      const punchIn = new Date(record.punchIn)
      return punchIn.getHours() > 9 || (punchIn.getHours() === 9 && punchIn.getMinutes() > 30)
    }).length

    // Early departures (before 5:00 PM)
    const earlyDepartures = attendanceRecords.filter(record => {
      if (!record.punchOut) return false
      const punchOut = new Date(record.punchOut)
      return punchOut.getHours() < 17
    }).length

    // Top performers (by attendance)
    const userAttendance = {}
    attendanceRecords.forEach(record => {
      if (record.status === 'office' || record.status === 'field') {
        const key = record.userId
        if (!userAttendance[key]) {
          userAttendance[key] = {
            name: record.user?.name || 'Unknown',
            department: record.user?.department || 'N/A',
            count: 0
          }
        }
        userAttendance[key].count++
      }
    })

    const topPerformers = Object.values(userAttendance)
      .map(u => ({
        ...u,
        attendance: workingDays > 0 ? Math.round((u.count / workingDays) * 100) : 0
      }))
      .sort((a, b) => b.attendance - a.attendance)
      .slice(0, 3)

    // Ensure we have at least some data for charts
    if (attendanceTrend.length === 0) {
      // Generate placeholder trend for last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        attendanceTrend.push({
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          office: 0,
          field: 0
        })
      }
    }

    if (departmentBreakdown.length === 0) {
      departmentBreakdown.push(
        { name: 'Engineering', value: 0, attendance: 0 },
        { name: 'Sales', value: 0, attendance: 0 },
        { name: 'Marketing', value: 0, attendance: 0 }
      )
    }

    if (topPerformers.length === 0) {
      topPerformers.push(
        { name: 'No data', department: '-', attendance: 0 }
      )
    }

    return NextResponse.json({
      summary: {
        totalEmployees,
        avgAttendanceRate: Math.min(avgAttendanceRate, 100),
        avgHoursWorked: parseFloat(avgHoursWorked),
        totalLeavesTaken: leaveRequests.filter(r => r.status === 'approved').length,
        lateArrivals,
        earlyDepartures
      },
      attendanceTrend,
      departmentBreakdown,
      leaveTypes,
      topPerformers
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    
    // Return mock data on error so charts still render
    return NextResponse.json({
      summary: {
        totalEmployees: 0,
        avgAttendanceRate: 0,
        avgHoursWorked: 0,
        totalLeavesTaken: 0,
        lateArrivals: 0,
        earlyDepartures: 0
      },
      attendanceTrend: [
        { date: 'Mon', office: 0, field: 0 },
        { date: 'Tue', office: 0, field: 0 },
        { date: 'Wed', office: 0, field: 0 },
        { date: 'Thu', office: 0, field: 0 },
        { date: 'Fri', office: 0, field: 0 }
      ],
      departmentBreakdown: [
        { name: 'No Data', value: 1, attendance: 0 }
      ],
      leaveTypes: [
        { name: 'No Data', value: 0 }
      ],
      topPerformers: [
        { name: 'No Data', department: '-', attendance: 0 }
      ]
    })
  }
}