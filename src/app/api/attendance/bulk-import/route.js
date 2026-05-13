import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/attendance/bulk-import
// Body: { records: [{ employeeId, date, status, session, punchIn, punchOut, notes }] }
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { records } = await request.json()
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'Records array is required' }, { status: 400 })
    }
    if (records.length > 500) {
      return NextResponse.json({ error: 'Max 500 records per import' }, { status: 400 })
    }

    const results = { created: 0, updated: 0, skipped: 0, errors: [] }

    for (const record of records) {
      try {
        const { employeeId, date, status, session: sess, punchIn, punchOut, notes } = record
        if (!employeeId || !date || !status) {
          results.errors.push({ record, error: 'Missing required fields: employeeId, date, status' })
          results.skipped++
          continue
        }

        const user = await prisma.user.findUnique({ where: { employeeId }, select: { id: true } })
        if (!user) {
          results.errors.push({ record, error: `Employee ${employeeId} not found` })
          results.skipped++
          continue
        }

        const attendanceDate = new Date(date)
        attendanceDate.setHours(0, 0, 0, 0)
        const sessionVal = sess || 'full_day'

        const existing = await prisma.attendance.findFirst({
          where: { userId: user.id, date: attendanceDate, session: sessionVal }
        })

        if (existing) {
          await prisma.attendance.update({
            where: { id: existing.id },
            data: {
              status,
              punchIn: punchIn ? new Date(punchIn) : existing.punchIn,
              punchOut: punchOut ? new Date(punchOut) : existing.punchOut,
              notes: notes || existing.notes
            }
          })
          results.updated++
        } else {
          await prisma.attendance.create({
            data: {
              userId: user.id,
              date: attendanceDate,
              status,
              session: sessionVal,
              punchIn: punchIn ? new Date(punchIn) : null,
              punchOut: punchOut ? new Date(punchOut) : null,
              notes
            }
          })
          results.created++
        }
      } catch (err) {
        results.errors.push({ record, error: err.message })
        results.skipped++
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('POST /api/attendance/bulk-import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
