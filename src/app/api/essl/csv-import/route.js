import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/essl/csv-import
// Accepts pre-parsed records from the client (after client-side CSV preview)
// Body: { records: [{ employeeId, date, punchIn?, punchOut?, status? }] }
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'hr'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { records } = await request.json()
    if (!Array.isArray(records) || !records.length)
      return NextResponse.json({ error: 'No records provided' }, { status: 400 })

    // Build employee ID → user map
    const users   = await prisma.user.findMany({
      where:  { employeeId: { not: null } },
      select: { id: true, name: true, employeeId: true },
    })
    const userMap = new Map(users.map(u => [String(u.employeeId), u]))

    const result = { created: 0, updated: 0, skipped: 0, unmapped: [], errors: [] }

    for (const rec of records) {
      try {
        const empId = String(rec.employeeId || '').trim()
        const user  = userMap.get(empId)

        if (!user) {
          if (!result.unmapped.includes(empId)) result.unmapped.push(empId)
          result.skipped++
          continue
        }

        const parsedDate = parseFlexDate(String(rec.date || ''))
        if (!parsedDate) {
          result.errors.push(`Invalid date "${rec.date}" for employee ${empId}`)
          result.skipped++
          continue
        }

        const attendanceDate = new Date(Date.UTC(
          parsedDate.getFullYear(),
          parsedDate.getMonth(),
          parsedDate.getDate()
        ))

        const punchIn  = rec.punchIn  ? parseDateTime(parsedDate, rec.punchIn)  : null
        const punchOut = rec.punchOut ? parseDateTime(parsedDate, rec.punchOut) : null

        // Store raw log entry
        await prisma.esslLog.create({
          data: {
            employeeId:  empId,
            punchTime:   punchIn || attendanceDate,
            punchType:   0,
            source:      'csv',
            processed:   true,
            processedAt: new Date(),
            userId:      user.id,
          },
        })

        const existing = await prisma.attendance.findFirst({
          where: { userId: user.id, date: attendanceDate },
        })

        if (!existing) {
          await prisma.attendance.create({
            data: {
              userId:  user.id,
              date:    attendanceDate,
              status:  rec.status || 'office',
              session: 'full_day',
              punchIn,
              punchOut,
              notes:   'Imported from ESSL CSV',
            },
          })
          result.created++
        } else {
          await prisma.attendance.update({
            where: { id: existing.id },
            data:  {
              punchIn:  punchIn  ?? existing.punchIn,
              punchOut: punchOut ?? existing.punchOut,
            },
          })
          result.updated++
        }
      } catch (err) {
        result.errors.push(err.message)
        result.skipped++
      }
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('CSV import error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── Date parsers ─────────────────────────────────────────────────────────────

function parseFlexDate(str) {
  if (!str) return null
  str = str.trim()

  // ISO: 2026-05-14
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str.slice(0, 10))
    return isNaN(d) ? null : d
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (dmy) {
    const [, dd, mm, yyyy] = dmy
    const y = +yyyy < 100 ? 2000 + +yyyy : +yyyy
    return new Date(y, +mm - 1, +dd)
  }

  // DD-Mon-YYYY e.g. 14-May-2026 or 14/May/2026
  const dmonY = str.match(/^(\d{1,2})[\/\-]([A-Za-z]+)[\/\-](\d{2,4})$/)
  if (dmonY) {
    const d = new Date(`${dmonY[2]} ${dmonY[1]}, ${dmonY[3]}`)
    return isNaN(d) ? null : d
  }

  const d = new Date(str)
  return isNaN(d) ? null : d
}

function parseDateTime(baseDate, timeStr) {
  if (!timeStr) return null
  const d = new Date(baseDate)
  const parts = String(timeStr).split(':').map(Number)
  d.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0)
  return d
}
