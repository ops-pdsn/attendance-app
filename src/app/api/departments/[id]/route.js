import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import prisma from '@/lib/db'

// GET /api/departments/[id] - Get single department
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const department = await prisma.department.findUnique({
      where: { id }
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Get users in this department
    const users = await prisma.user.findMany({
      where: { department: department.name },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    })

    return NextResponse.json({ ...department, users })
  } catch (error) {
    console.error('GET /api/departments/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/departments/[id] - Update department (Admin/HR only)
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'admin' && session.user.role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = params
    const body = await request.json()
    const { name, description, color, isActive } = body

    // Get current department
    const current = await prisma.department.findUnique({
      where: { id }
    })

    if (!current) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Build update data
    const updateData = {}
    
    if (name !== undefined) {
      if (name.trim().length < 2) {
        return NextResponse.json(
          { error: 'Department name must be at least 2 characters' },
          { status: 400 }
        )
      }
      
      // Check if new name already exists (if changing name)
      if (name.trim() !== current.name) {
        const existing = await prisma.department.findUnique({
          where: { name: name.trim() }
        })
        if (existing) {
          return NextResponse.json(
            { error: 'Department name already exists' },
            { status: 400 }
          )
        }
        
        // Update all users with old department name to new name
        await prisma.user.updateMany({
          where: { department: current.name },
          data: { department: name.trim() }
        })
      }
      
      updateData.name = name.trim()
    }
    
    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }
    
    if (color !== undefined) {
      updateData.color = color
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    const department = await prisma.department.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(department)
  } catch (error) {
    console.error('PATCH /api/departments/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/departments/[id] - Delete department (Admin only)
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { id } = params

    const department = await prisma.department.findUnique({
      where: { id }
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Check if any users are in this department
    const userCount = await prisma.user.count({
      where: { department: department.name }
    })

    if (userCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete department with ${userCount} assigned users. Please reassign users first.` },
        { status: 400 }
      )
    }

    await prisma.department.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Department deleted' })
  } catch (error) {
    console.error('DELETE /api/departments/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}