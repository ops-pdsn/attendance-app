import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId: session.user.id
    }

    if (searchParams.get('tasks') === 'true') {
      backup.tasks = await prisma.task.findMany({
        where: { userId: session.user.id },
        select: { title: true, date: true, type: true, priority: true, completed: true, description: true }
      })
    }

    if (searchParams.get('attendance') === 'true') {
      backup.attendance = await prisma.attendance.findMany({
        where: { userId: session.user.id },
        select: { date: true, status: true, session: true, notes: true }
      })
    }

    if (searchParams.get('holidays') === 'true') {
      backup.holidays = await prisma.holiday.findMany({
        select: { name: true, date: true, type: true, description: true }
      })
    }

    return NextResponse.json(backup)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const backup = await request.json()
    const results = { tasks: 0, attendance: 0, holidays: 0 }

    if (backup.tasks) {
      for (const task of backup.tasks) {
        try {
          await prisma.task.create({
            data: { ...task, date: new Date(task.date), userId: session.user.id }
          })
          results.tasks++
        } catch (e) { /* skip duplicates */ }
      }
    }

    if (backup.attendance) {
      for (const record of backup.attendance) {
        try {
          const existing = await prisma.attendance.findFirst({
            where: { userId: session.user.id, date: new Date(record.date) }
          })
          if (!existing) {
            await prisma.attendance.create({
              data: { ...record, date: new Date(record.date), userId: session.user.id }
            })
            results.attendance++
          }
        } catch (e) { /* skip */ }
      }
    }

    if (backup.holidays && (session.user.role === 'admin' || session.user.role === 'hr')) {
      for (const holiday of backup.holidays) {
        try {
          const existing = await prisma.holiday.findFirst({
            where: { date: new Date(holiday.date) }
          })
          if (!existing) {
            await prisma.holiday.create({
              data: { ...holiday, date: new Date(holiday.date) }
            })
            results.holidays++
          }
        } catch (e) { /* skip */ }
      }
    }

    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}