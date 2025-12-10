export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '@/lib/db'

// GET /api/departments - Get all departments
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('stats') === 'true'

    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' }
    })

    // If stats requested, get user count per department
    if (includeStats) {
      const departmentsWithStats = await Promise.all(
        departments.map(async (dept) => {
          const userCount = await prisma.user.count({
            where: { department: dept.name }
          })
          return { ...dept, userCount }
        })
      )
      return NextResponse.json(departmentsWithStats)
    }

    return NextResponse.json(departments)
  } catch (error) {
    console.error('GET /api/departments error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/departments - Create a new department (Admin/HR only)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or HR
    if (session.user.role !== 'admin' && session.user.role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, color } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Department name must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Check if department already exists
    const existing = await prisma.department.findUnique({
      where: { name: name.trim() }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Department already exists' },
        { status: 400 }
      )
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#3b82f6'
      }
    })

    return NextResponse.json(department, { status: 201 })
  } catch (error) {
    console.error('POST /api/departments error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
