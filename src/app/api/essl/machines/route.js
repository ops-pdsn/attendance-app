import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'logs') {
      const logs = await prisma.esslLog.findMany({
        orderBy: { createdAt: 'desc' },
        take:    100,
        include: {
          machine: { select: { name: true, serialNo: true } },
        },
      })
      return NextResponse.json(logs)
    }

    const [machines, todayPunches, unmatchedCount] = await Promise.all([
      prisma.esslMachine.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { logs: true } } },
      }),
      prisma.esslLog.count({
        where: { createdAt: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) } },
      }),
      prisma.esslLog.count({ where: { processed: false } }),
    ])

    return NextResponse.json({ machines, todayPunches, unmatchedCount })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    if (!body.serialNo) return NextResponse.json({ error: 'serialNo required' }, { status: 400 })

    const machine = await prisma.esslMachine.upsert({
      where:  { serialNo: body.serialNo },
      update: {
        name:           body.name,
        location:       body.location,
        ipAddress:      body.ipAddress,
        port:           body.port ? parseInt(body.port) : 4370,
        devicePassword: body.devicePassword || '0',
      },
      create: {
        serialNo:       body.serialNo,
        name:           body.name || null,
        location:       body.location || null,
        ipAddress:      body.ipAddress || null,
        port:           body.port ? parseInt(body.port) : 4370,
        devicePassword: body.devicePassword || '0',
      },
    })
    return NextResponse.json(machine, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    await prisma.esslMachine.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
