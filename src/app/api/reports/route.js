import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/reports?type=attendance|leave|payroll|task&start=&end=&department=&userId=&format=json|csv
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'attendance'
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const department = searchParams.get('department')
    const userId = searchParams.get('userId')
    const format = searchParams.get('format') || 'json'

    const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const endDate = end ? new Date(end + 'T23:59:59.999Z') : new Date()

    const userWhere = { isActive: true }
    if (department) userWhere.department = department
    if (userId) userWhere.id = userId

    let data = []
    let headers = []

    if (type === 'attendance') {
      const records = await prisma.attendance.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          user: userWhere
        },
        include: { user: { select: { name: true, email: true, employeeId: true, department: true } } },
        orderBy: [{ user: { name: 'asc' } }, { date: 'asc' }]
      })
      headers = ['Employee ID', 'Name', 'Email', 'Department', 'Date', 'Status', 'Session', 'Punch In', 'Punch Out']
      data = records.map(r => ({
        'Employee ID': r.user.employeeId || '',
        'Name': r.user.name || '',
        'Email': r.user.email,
        'Department': r.user.department || '',
        'Date': new Date(r.date).toLocaleDateString(),
        'Status': r.status,
        'Session': r.session,
        'Punch In': r.punchIn ? new Date(r.punchIn).toLocaleTimeString() : '',
        'Punch Out': r.punchOut ? new Date(r.punchOut).toLocaleTimeString() : ''
      }))
    } else if (type === 'leave') {
      const records = await prisma.leaveRequest.findMany({
        where: {
          startDate: { gte: startDate },
          endDate: { lte: endDate },
          user: userWhere
        },
        include: {
          user: { select: { name: true, email: true, employeeId: true, department: true } },
          leaveType: { select: { name: true, code: true } }
        },
        orderBy: { startDate: 'asc' }
      })
      headers = ['Employee ID', 'Name', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason']
      data = records.map(r => ({
        'Employee ID': r.user.employeeId || '',
        'Name': r.user.name || '',
        'Department': r.user.department || '',
        'Leave Type': r.leaveType.name,
        'Start Date': new Date(r.startDate).toLocaleDateString(),
        'End Date': new Date(r.endDate).toLocaleDateString(),
        'Days': r.days,
        'Status': r.status,
        'Reason': r.reason || ''
      }))
    } else if (type === 'task') {
      const records = await prisma.task.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          user: userWhere
        },
        include: { user: { select: { name: true, email: true, employeeId: true, department: true } } },
        orderBy: { date: 'asc' }
      })
      headers = ['Employee ID', 'Name', 'Department', 'Date', 'Title', 'Type', 'Priority', 'Completed']
      data = records.map(r => ({
        'Employee ID': r.user.employeeId || '',
        'Name': r.user.name || '',
        'Department': r.user.department || '',
        'Date': new Date(r.date).toLocaleDateString(),
        'Title': r.title,
        'Type': r.type,
        'Priority': r.priority,
        'Completed': r.completed ? 'Yes' : 'No'
      }))
    }

    if (format === 'csv') {
      const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))
      ]
      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json({ type, startDate, endDate, count: data.length, headers, data })
  } catch (error) {
    console.error('GET /api/reports error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
