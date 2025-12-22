import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// =====================================================
// AVAILABLE MODULES - ONLY YOUR EXISTING PAGES
// =====================================================
const AVAILABLE_MODULES = [
  'timesheet',      // /timesheet
  'leave',          // /leave
  'shifts',         // /shifts
  'notifications',  // /notifications
  'team',           // /team
  'analytics',      // /analytics
  'payroll',        // /payroll
  'admin'           // /admin
]

// GET /api/permissions
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Regular users can only view their own permissions
    if (!['admin', 'hr'].includes(session.user.role) && userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (userId) {
      const permissions = await prisma.permission.findMany({
        where: { userId },
        orderBy: { module: 'asc' }
      })

      // Return permissions as object keyed by module
      const permissionsMap = {}
      AVAILABLE_MODULES.forEach(module => {
        const perm = permissions.find(p => p.module === module)
        permissionsMap[module] = perm || {
          module,
          canRead: false,
          canWrite: false,
          canEdit: false,
          canDelete: false
        }
      })

      return NextResponse.json({
        userId,
        permissions: permissionsMap,
        modules: AVAILABLE_MODULES
      })
    }

    // Admin/HR: Get all users with permissions
    if (['admin', 'hr'].includes(session.user.role)) {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          permissions: true
        },
        orderBy: { name: 'asc' }
      })

      return NextResponse.json({
        users,
        modules: AVAILABLE_MODULES
      })
    }

    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  } catch (error) {
    console.error('Get permissions error:', error)
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
  }
}

// POST /api/permissions
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admin can manage permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, permissions } = body

    if (!userId || !permissions) {
      return NextResponse.json({ error: 'userId and permissions are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role === 'admin') {
      return NextResponse.json({ error: 'Cannot modify admin permissions' }, { status: 400 })
    }

    const results = []
    for (const [module, perms] of Object.entries(permissions)) {
      if (!AVAILABLE_MODULES.includes(module)) continue

      const result = await prisma.permission.upsert({
        where: {
          userId_module: { userId, module }
        },
        update: {
          canRead: perms.canRead ?? false,
          canWrite: perms.canWrite ?? false,
          canEdit: perms.canEdit ?? false,
          canDelete: perms.canDelete ?? false
        },
        create: {
          userId,
          module,
          canRead: perms.canRead ?? false,
          canWrite: perms.canWrite ?? false,
          canEdit: perms.canEdit ?? false,
          canDelete: perms.canDelete ?? false
        }
      })
      results.push(result)
    }

    return NextResponse.json({
      success: true,
      message: 'Permissions updated',
      permissions: results
    })
  } catch (error) {
    console.error('Set permissions error:', error)
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 })
  }
}

// DELETE /api/permissions
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    await prisma.permission.deleteMany({
      where: { userId }
    })

    return NextResponse.json({ success: true, message: 'Permissions reset' })
  } catch (error) {
    console.error('Delete permissions error:', error)
    return NextResponse.json({ error: 'Failed to reset permissions' }, { status: 500 })
  }
}