import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

// POST /api/leave-types/seed - Seed default leave types
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const defaultLeaveTypes = [
      {
        name: 'Casual Leave',
        code: 'CL',
        description: 'For personal matters and emergencies',
        color: '#3b82f6',
        defaultDays: 12,
        carryForward: false,
        isPaid: true
      },
      {
        name: 'Sick Leave',
        code: 'SL',
        description: 'For health-related absences',
        color: '#ef4444',
        defaultDays: 12,
        carryForward: false,
        isPaid: true
      },
      {
        name: 'Earned Leave',
        code: 'EL',
        description: 'Annual vacation leave',
        color: '#10b981',
        defaultDays: 15,
        carryForward: true,
        maxCarryForward: 30,
        isPaid: true
      },
      {
        name: 'Work From Home',
        code: 'WFH',
        description: 'Remote working day',
        color: '#8b5cf6',
        defaultDays: 24,
        carryForward: false,
        requiresApproval: true,
        isPaid: true
      },
      {
        name: 'Compensatory Off',
        code: 'COMP',
        description: 'Leave earned by working on holidays/weekends',
        color: '#f59e0b',
        defaultDays: 0,
        carryForward: false,
        isPaid: true
      },
      {
        name: 'Loss of Pay',
        code: 'LOP',
        description: 'Unpaid leave when balance exhausted',
        color: '#6b7280',
        defaultDays: 0,
        carryForward: false,
        requiresApproval: true,
        isPaid: false
      },
      {
        name: 'Maternity Leave',
        code: 'ML',
        description: 'Leave for expecting mothers',
        color: '#ec4899',
        defaultDays: 180,
        carryForward: false,
        isPaid: true
      },
      {
        name: 'Paternity Leave',
        code: 'PL',
        description: 'Leave for new fathers',
        color: '#06b6d4',
        defaultDays: 15,
        carryForward: false,
        isPaid: true
      }
    ]

    let created = 0
    let updated = 0

    for (const leaveType of defaultLeaveTypes) {
      const existing = await prisma.leaveType.findUnique({
        where: { code: leaveType.code }
      })

      if (existing) {
        await prisma.leaveType.update({
          where: { code: leaveType.code },
          data: leaveType
        })
        updated++
      } else {
        await prisma.leaveType.create({
          data: leaveType
        })
        created++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Leave types seeded: ${created} created, ${updated} updated`,
      total: defaultLeaveTypes.length
    })
  } catch (error) {
    console.error('Seed leave types error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}