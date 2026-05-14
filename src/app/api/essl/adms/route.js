import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// ─── ZKTeco / ESSL ADMS Protocol ─────────────────────────────────────────────
// GET  → device handshake — machine asks "when did we last sync?"
//        machine sends: GET /api/essl/adms?SN=DEVICESERIAL&options=all&pushver=2.2.14
//        server returns: GET_STAMP\r\nSTAMP=0\r\n
// POST → machine pushes attendance logs
//        body line 1 : SN=SERIAL&table=ATTLOG&Stamp=0
//        body line 2+: USERID\tDATETIME\tSTATUS\tVERIFY\tWORKCODE\n
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const serialNo = searchParams.get('SN') || searchParams.get('sn') || 'UNKNOWN'

    const machine = await prisma.esslMachine.upsert({
      where:  { serialNo },
      update: { isActive: true },
      create: { serialNo, isActive: true },
    })

    // Stamp = unix seconds of last sync (0 = send everything)
    const stamp = machine.lastSyncAt
      ? Math.floor(machine.lastSyncAt.getTime() / 1000)
      : 0

    return new Response(`GET_STAMP\r\nSTAMP=${stamp}\r\n`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    console.error('ADMS GET error:', err)
    return new Response('ERROR', { status: 500 })
  }
}

export async function POST(request) {
  try {
    const rawBody = await request.text()
    const lines   = rawBody.split(/\r?\n/).filter(l => l.trim())
    if (!lines.length) return new Response('OK')

    // First line = URL-encoded params
    const params   = new URLSearchParams(lines[0])
    const serialNo = params.get('SN') || 'UNKNOWN'
    const table    = params.get('table') || ''

    // Ignore non-attendance tables (OPERLOG, OPTIONS, etc.)
    if (table !== 'ATTLOG') {
      return new Response('OK', { headers: { 'Content-Type': 'text/plain' } })
    }

    const machine = await prisma.esslMachine.upsert({
      where:  { serialNo },
      update: { isActive: true },
      create: { serialNo, isActive: true },
    })

    // Pre-fetch all mapped users (employee ID → user)
    const users    = await prisma.user.findMany({ where: { employeeId: { not: null } }, select: { id: true, employeeId: true } })
    const userMap  = new Map(users.map(u => [u.employeeId, u.id]))

    let synced = 0
    const logInserts = []

    for (const line of lines.slice(1)) {
      // Tab-separated: USERID  DATETIME  STATUS  VERIFY  WORKCODE  RESERVED
      const parts = line.trim().split(/\t+/)
      if (parts.length < 2) continue

      const employeeId = parts[0]?.trim()
      const datetimeStr = parts[1]?.trim()
      const punchType  = parseInt(parts[2] ?? '0') || 0
      const verifyMode = parseInt(parts[3] ?? '0') || 0

      if (!employeeId || !datetimeStr) continue

      const punchTime = new Date(datetimeStr.replace(' ', 'T'))
      if (isNaN(punchTime.getTime())) continue

      const userId = userMap.get(employeeId) || null

      logInserts.push({
        machineId:   machine.id,
        employeeId,
        punchTime,
        punchType,
        verifyMode,
        source:      'adms',
        rawData:     line.trim(),
        processed:   !!userId,
        processedAt: userId ? new Date() : null,
        userId,
      })

      if (userId) {
        await upsertAttendance(userId, punchTime, punchType)
        synced++
      }
    }

    // Batch-insert raw logs
    if (logInserts.length) {
      await prisma.esslLog.createMany({ data: logInserts, skipDuplicates: true })
    }

    await prisma.esslMachine.update({
      where: { id: machine.id },
      data:  { lastSyncAt: new Date(), totalPunches: { increment: logInserts.length } },
    })

    console.log(`ADMS [${serialNo}]: ${logInserts.length} punches received, ${synced} matched to users`)
    return new Response('OK', { headers: { 'Content-Type': 'text/plain' } })
  } catch (err) {
    console.error('ADMS POST error:', err)
    return new Response('ERROR', { status: 500 })
  }
}

async function upsertAttendance(userId, punchTime, punchType) {
  const attendanceDate = new Date(Date.UTC(
    punchTime.getUTCFullYear(),
    punchTime.getUTCMonth(),
    punchTime.getUTCDate()
  ))

  const existing = await prisma.attendance.findFirst({ where: { userId, date: attendanceDate } })

  if (!existing) {
    // First punch of the day → create record with punchIn
    if (punchType === 0 || punchType <= 1) {
      await prisma.attendance.create({
        data: {
          userId,
          date:    attendanceDate,
          status:  'office',
          session: 'full_day',
          punchIn: punchType === 0 ? punchTime : null,
          notes:   'Auto-recorded via ESSL ADMS',
        },
      })
    }
  } else {
    // Subsequent punch → update punchOut if this is later
    if (punchType === 1 || (!existing.punchOut && punchTime > existing.punchIn)) {
      await prisma.attendance.update({
        where: { id: existing.id },
        data:  { punchOut: punchTime },
      })
    }
  }
}
