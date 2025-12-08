import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth'

// GET /api/profile - Get current user's profile
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tasks: true,
            attendance: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get some stats
    const completedTasks = await prisma.task.count({
      where: { userId: session.user.id, completed: true }
    })

    const thisMonthAttendance = await prisma.attendance.count({
      where: {
        userId: session.user.id,
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    })

    return NextResponse.json({
      ...user,
      stats: {
        totalTasks: user._count.tasks,
        completedTasks,
        totalAttendance: user._count.attendance,
        thisMonthAttendance
      }
    })
  } catch (error) {
    console.error('GET /api/profile error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/profile - Update current user's profile
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, department, currentPassword, newPassword } = body

    // Build update data
    const updateData = {}

    if (name !== undefined) {
      if (!name || name.trim().length < 2) {
        return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    if (phone !== undefined) {
      updateData.phone = phone || null
    }

    if (department !== undefined) {
      updateData.department = department || null
    }

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to change password' }, { status: 400 })
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
      }

      // Verify current password
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true }
      })

      const isValid = await verifyPassword(currentPassword, user.password)
      if (!isValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }

      // Hash new password
      updateData.password = await hashPassword(newPassword)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
        phone: true,
        isActive: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('PATCH /api/profile error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}