export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '@/lib/db'

// GET /api/leave-balance - Get user's leave balance
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year')) || new Date().getFullYear()
    const userId = searchParams.get('userId') || session.user.id

    // Only admin/hr can view other users' balance
    if (userId !== session.user.id && session.user.role !== 'admin' && session.user.role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all leave types
    const leaveTypes = await prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })

    // Get existing balances
    const existingBalances = await prisma.leaveBalance.findMany({
      where: { userId, year },
      include: { leaveType: true }
    })

    // Create balance map
    const balanceMap = new Map(existingBalances.map(b => [b.leaveTypeId, b]))

    // Build response with all leave types
    const balances = await Promise.all(leaveTypes.map(async (lt) => {
      let balance = balanceMap.get(lt.id)

      // If no balance exists, create one with defaults
      if (!balance) {
        balance = await prisma.leaveBalance.create({
          data: {
            userId,
            leaveTypeId: lt.id,
            year,
            total: lt.defaultDays,
            used: 0,
            pending: 0,
            carryForward: 0
          },
          include: { leaveType: true }
        })
      }

      return {
        id: balance.id,
        leaveType: {
          id: lt.id,
          name: lt.name,
          code: lt.code,
          color: lt.color,
          isPaid: lt.isPaid
        },
        year: balance.year,
        total: balance.total,
        used: balance.used,
        pending: balance.pending,
        available: balance.total + balance.carryForward - balance.used - balance.pending,
        carryForward: balance.carryForward
      }
    }))

    return NextResponse.json(balances)
  } catch (error) {
    console.error('GET /api/leave-balance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/leave-balance - Initialize or update leave balance (admin/hr only)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'hr')) {
      return NextResponse.json({ error: 'Admin/HR access required' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, leaveTypeId, year, total, carryForward } = body

    if (!userId || !leaveTypeId) {
      return NextResponse.json({ error: 'userId and leaveTypeId are required' }, { status: 400 })
    }

    const currentYear = year || new Date().getFullYear()

    const balance = await prisma.leaveBalance.upsert({
      where: {
        userId_leaveTypeId_year: {
          userId,
          leaveTypeId,
          year: currentYear
        }
      },
      update: {
        total: total !== undefined ? total : undefined,
        carryForward: carryForward !== undefined ? carryForward : undefined
      },
      create: {
        userId,
        leaveTypeId,
        year: currentYear,
        total: total || 0,
        carryForward: carryForward || 0
      },
      include: { leaveType: true }
    })

    return NextResponse.json(balance)
  } catch (error) {
    console.error('POST /api/leave-balance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
