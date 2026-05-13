import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/task-categories - list all categories with sub-categories
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const categories = await prisma.taskCategory.findMany({
      where: { isActive: true },
      include: {
        subCategories: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(categories)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/task-categories - create category or sub-category
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { name, description, color, categoryId } = await request.json()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    if (categoryId) {
      // Create sub-category
      const sub = await prisma.taskSubCategory.create({
        data: { name, categoryId }
      })
      return NextResponse.json(sub, { status: 201 })
    }

    // Create category
    const cat = await prisma.taskCategory.create({
      data: { name, description, color: color || '#3b82f6' }
    })
    return NextResponse.json(cat, { status: 201 })
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Name already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/task-categories - update category or sub-category
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, name, description, color, isActive, isSubCategory } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    if (isSubCategory) {
      const sub = await prisma.taskSubCategory.update({
        where: { id },
        data: { ...(name && { name }), ...(isActive !== undefined && { isActive }) }
      })
      return NextResponse.json(sub)
    }

    const cat = await prisma.taskCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(isActive !== undefined && { isActive })
      }
    })
    return NextResponse.json(cat)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/task-categories - soft-delete (deactivate) category or sub-category
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const isSubCategory = searchParams.get('sub') === '1'

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    if (isSubCategory) {
      await prisma.taskSubCategory.update({ where: { id }, data: { isActive: false } })
    } else {
      await prisma.taskCategory.update({ where: { id }, data: { isActive: false } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
