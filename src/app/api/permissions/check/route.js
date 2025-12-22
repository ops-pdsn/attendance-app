import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/permissions/check?module=attendance&action=read
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ allowed: false, reason: 'Not authenticated' })
    }

    const { searchParams } = new URL(request.url)
    const module = searchParams.get('module')
    const action = searchParams.get('action') || 'read' // read, write, edit, delete

    if (!module) {
      return NextResponse.json({ error: 'Module is required' }, { status: 400 })
    }

    // Admins have full access to everything
    if (session.user.role === 'admin') {
      return NextResponse.json({ 
        allowed: true, 
        reason: 'Admin has full access',
        role: 'admin'
      })
    }

    // HR has full access except admin module
    if (session.user.role === 'hr') {
      if (module === 'admin') {
        // HR can access admin but not modify critical settings
        return NextResponse.json({ 
          allowed: action === 'read',
          reason: 'HR has read-only admin access',
          role: 'hr'
        })
      }
      return NextResponse.json({ 
        allowed: true, 
        reason: 'HR has full access',
        role: 'hr'
      })
    }

    // Check specific permissions for the user
    const permission = await prisma.permission.findUnique({
      where: {
        userId_module: {
          userId: session.user.id,
          module
        }
      }
    })

    // If no permission record exists, check role defaults
    if (!permission) {
      // Default permissions based on role
      const defaultPermissions = getDefaultPermissions(session.user.role, module)
      const actionField = `can${action.charAt(0).toUpperCase() + action.slice(1)}`
      
      return NextResponse.json({
        allowed: defaultPermissions[actionField] ?? false,
        reason: 'Using default role permissions',
        role: session.user.role,
        isDefault: true
      })
    }

    // Check specific action permission
    const actionMap = {
      read: permission.canRead,
      write: permission.canWrite,
      edit: permission.canEdit,
      delete: permission.canDelete
    }

    const allowed = actionMap[action] ?? false

    return NextResponse.json({
      allowed,
      reason: allowed ? 'Permission granted' : 'Permission denied',
      role: session.user.role,
      permission
    })
  } catch (error) {
    console.error('Check permission error:', error)
    return NextResponse.json({ allowed: false, error: 'Permission check failed' }, { status: 500 })
  }
}

// Default permissions based on role
function getDefaultPermissions(role, module) {
  const defaults = {
    manager: {
      attendance: { canRead: true, canWrite: true, canEdit: true, canDelete: false },
      tasks: { canRead: true, canWrite: true, canEdit: true, canDelete: true },
      leave: { canRead: true, canWrite: true, canEdit: true, canDelete: false },
      team: { canRead: true, canWrite: false, canEdit: false, canDelete: false },
      analytics: { canRead: true, canWrite: false, canEdit: false, canDelete: false },
      payroll: { canRead: false, canWrite: false, canEdit: false, canDelete: false },
      admin: { canRead: false, canWrite: false, canEdit: false, canDelete: false },
      shifts: { canRead: true, canWrite: false, canEdit: false, canDelete: false },
      holidays: { canRead: true, canWrite: false, canEdit: false, canDelete: false },
      reports: { canRead: true, canWrite: false, canEdit: false, canDelete: false }
    },
    employee: {
      attendance: { canRead: true, canWrite: true, canEdit: false, canDelete: false },
      tasks: { canRead: true, canWrite: true, canEdit: true, canDelete: true },
      leave: { canRead: true, canWrite: true, canEdit: false, canDelete: false },
      team: { canRead: false, canWrite: false, canEdit: false, canDelete: false },
      analytics: { canRead: false, canWrite: false, canEdit: false, canDelete: false },
      payroll: { canRead: false, canWrite: false, canEdit: false, canDelete: false },
      admin: { canRead: false, canWrite: false, canEdit: false, canDelete: false },
      shifts: { canRead: true, canWrite: false, canEdit: false, canDelete: false },
      holidays: { canRead: true, canWrite: false, canEdit: false, canDelete: false },
      reports: { canRead: false, canWrite: false, canEdit: false, canDelete: false }
    }
  }

  return defaults[role]?.[module] || { canRead: false, canWrite: false, canEdit: false, canDelete: false }
}