import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/admin/bulk - Perform bulk actions on users
export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin can perform bulk actions
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, userIds, data } = body

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Action and userIds array are required' },
        { status: 400 }
      )
    }

    // Prevent admin from modifying themselves in bulk actions
    const filteredUserIds = userIds.filter(id => id !== session.user.id)
    
    if (filteredUserIds.length === 0) {
      return NextResponse.json(
        { error: 'Cannot perform bulk actions on your own account' },
        { status: 400 }
      )
    }

    let result
    let message

    switch (action) {
      case 'activate':
        result = await prisma.user.updateMany({
          where: { id: { in: filteredUserIds } },
          data: { isActive: true }
        })
        message = `${result.count} user(s) activated`
        break

      case 'deactivate':
        result = await prisma.user.updateMany({
          where: { id: { in: filteredUserIds } },
          data: { isActive: false }
        })
        message = `${result.count} user(s) deactivated`
        break

      case 'changeRole':
        if (!data?.role || !['employee', 'hr', 'admin'].includes(data.role)) {
          return NextResponse.json(
            { error: 'Valid role is required (employee, hr, admin)' },
            { status: 400 }
          )
        }
        result = await prisma.user.updateMany({
          where: { id: { in: filteredUserIds } },
          data: { role: data.role }
        })
        message = `${result.count} user(s) changed to ${data.role}`
        break

      case 'assignDepartment':
        if (data?.department === undefined) {
          return NextResponse.json(
            { error: 'Department is required' },
            { status: 400 }
          )
        }
        result = await prisma.user.updateMany({
          where: { id: { in: filteredUserIds } },
          data: { department: data.department || null }
        })
        message = `${result.count} user(s) assigned to ${data.department || 'no department'}`
        break

      case 'delete':
        // First check if any users have data
        const usersWithData = await prisma.user.findMany({
          where: { id: { in: filteredUserIds } },
          select: {
            id: true,
            name: true,
            _count: {
              select: { tasks: true, attendance: true }
            }
          }
        })

        const hasData = usersWithData.some(u => u._count.tasks > 0 || u._count.attendance > 0)
        
        if (hasData && !data?.force) {
          return NextResponse.json({
            error: 'Some users have associated data. Set force=true to delete anyway.',
            usersWithData: usersWithData.filter(u => u._count.tasks > 0 || u._count.attendance > 0)
          }, { status: 400 })
        }

        // Delete users (cascade will handle related data)
        result = await prisma.user.deleteMany({
          where: { id: { in: filteredUserIds } }
        })
        message = `${result.count} user(s) deleted`
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message,
      affected: result.count
    })
  } catch (error) {
    console.error('POST /api/admin/bulk error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}