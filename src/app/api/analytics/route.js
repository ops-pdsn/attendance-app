import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['admin', 'hr', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || 'month'

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (range) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1)
        break
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3)
        break
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }

    // Fetch data
    const [users, attendance, tasks, leaveRequests] = await Promise.all([
      prisma.user.findMany({ where: { role: { not: 'admin' } } }),
      prisma.attendance.findMany({
        where: {
          date: { gte: startDate, lte: endDate }
        },
        include: { user: { select: { name: true, department: true } } }
      }),
      prisma.task.findMany({
        where: {
          date: { gte: startDate, lte: endDate }
        }
      }),
      prisma.leaveRequest.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        include: { leaveType: true }
      })
    ])

    // Calculate summary
    const totalEmployees = users.length
    const totalAttendanceDays = attendance.length
    const uniqueEmployeesPresent = [...new Set(attendance.map(a => a.userId))].length
    const avgAttendanceRate = totalEmployees > 0 
      ? Math.round((uniqueEmployeesPresent / totalEmployees) * 100) 
      : 0

    // Calculate average work hours
    let totalHours = 0
    let hoursCount = 0
    attendance.forEach(a => {
      if (a.punchIn && a.punchOut) {
        const hours = (new Date(a.punchOut) - new Date(a.punchIn)) / (1000 * 60 * 60)
        if (hours > 0 && hours < 24) {
          totalHours += hours
          hoursCount++
        }
      }
    })
    const avgWorkHours = hoursCount > 0 ? (totalHours / hoursCount).toFixed(1) : 0

    // Tasks stats
    const tasksCompleted = tasks.filter(t => t.completed).length
    const taskCompletionRate = tasks.length > 0 
      ? Math.round((tasksCompleted / tasks.length) * 100) 
      : 0

    // Leaves taken
    const totalLeavesTaken = leaveRequests.filter(l => l.status === 'approved').length

    // Attendance trend (last 7 days)
    const attendanceTrend = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayAttendance = attendance.filter(a => {
        const aDate = new Date(a.date)
        return aDate >= date && aDate < nextDate
      })

      attendanceTrend.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        present: dayAttendance.filter(a => a.status === 'office' || a.status === 'field').length,
        absent: Math.max(0, totalEmployees - dayAttendance.length),
        onLeave: 0
      })
    }

    // Department attendance
    const departments = [...new Set(users.map(u => u.department).filter(Boolean))]
    const departmentAttendance = departments.map(dept => {
      const deptUsers = users.filter(u => u.department === dept)
      const deptAttendance = attendance.filter(a => a.user?.department === dept)
      const rate = deptUsers.length > 0 
        ? Math.round((deptAttendance.length / (deptUsers.length * 30)) * 100)
        : 0
      return { name: dept, value: Math.min(100, rate) }
    })

    // Leave distribution
    const leaveTypes = {}
    leaveRequests.filter(l => l.status === 'approved').forEach(l => {
      const typeName = l.leaveType?.name || 'Other'
      leaveTypes[typeName] = (leaveTypes[typeName] || 0) + 1
    })
    const leaveDistribution = Object.entries(leaveTypes).map(([name, value]) => ({ name, value }))

    // Top performers (by attendance)
    const userAttendance = {}
    const userTasks = {}
    
    attendance.forEach(a => {
      userAttendance[a.userId] = (userAttendance[a.userId] || 0) + 1
    })
    
    tasks.filter(t => t.completed).forEach(t => {
      userTasks[t.userId] = (userTasks[t.userId] || 0) + 1
    })

    const topPerformers = users
      .map(u => ({
        name: u.name,
        attendance: Math.min(100, Math.round((userAttendance[u.id] || 0) / 30 * 100)),
        tasks: userTasks[u.id] || 0
      }))
      .sort((a, b) => b.attendance - a.attendance)
      .slice(0, 5)

    // Work hours trend (weekly)
    const workHoursTrend = []
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (i * 7) - 6)
      const weekEnd = new Date()
      weekEnd.setDate(weekEnd.getDate() - (i * 7))

      const weekAttendance = attendance.filter(a => {
        const aDate = new Date(a.date)
        return aDate >= weekStart && aDate <= weekEnd && a.punchIn && a.punchOut
      })

      let weekHours = 0
      weekAttendance.forEach(a => {
        const hours = (new Date(a.punchOut) - new Date(a.punchIn)) / (1000 * 60 * 60)
        if (hours > 0 && hours < 24) weekHours += hours
      })

      workHoursTrend.push({
        date: 'Week ' + (4 - i),
        hours: parseFloat((weekHours / Math.max(1, weekAttendance.length)).toFixed(1)) * 5
      })
    }

    // Late arrivals (after 9:30 AM)
    const lateArrivals = []
    for (let i = 4; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const dayAttendance = attendance.filter(a => {
        const aDate = new Date(a.date)
        aDate.setHours(0, 0, 0, 0)
        return aDate.getTime() === date.getTime() && a.punchIn
      })

      const lateCount = dayAttendance.filter(a => {
        const punchIn = new Date(a.punchIn)
        return punchIn.getHours() > 9 || (punchIn.getHours() === 9 && punchIn.getMinutes() > 30)
      }).length

      lateArrivals.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count: lateCount
      })
    }

    // Overtime by department
    const overtimeHours = departments.map(dept => {
      const deptAttendance = attendance.filter(a => a.user?.department === dept && a.punchIn && a.punchOut)
      let overtime = 0
      deptAttendance.forEach(a => {
        const hours = (new Date(a.punchOut) - new Date(a.punchIn)) / (1000 * 60 * 60)
        if (hours > 8) overtime += (hours - 8)
      })
      return { name: dept, hours: Math.round(overtime) }
    })

    return NextResponse.json({
      summary: {
        totalEmployees,
        avgAttendanceRate,
        avgWorkHours: parseFloat(avgWorkHours),
        totalLeavesTaken,
        tasksCompleted,
        taskCompletionRate
      },
      attendanceTrend,
      departmentAttendance: departmentAttendance.length > 0 ? departmentAttendance : [
        { name: 'General', value: avgAttendanceRate }
      ],
      workHoursTrend,
      leaveDistribution: leaveDistribution.length > 0 ? leaveDistribution : [
        { name: 'No Data', value: 1 }
      ],
      topPerformers,
      lateArrivals,
      overtimeHours: overtimeHours.length > 0 ? overtimeHours : [
        { name: 'General', hours: 0 }
      ]
    })
  } catch (error) {
    console.error('GET /api/analytics error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}