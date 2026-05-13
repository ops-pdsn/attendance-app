import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/birthdays — upcoming birthdays and work anniversaries (next 30 days)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, email: true, department: true,
        dateOfBirth: true, dateOfJoining: true, employeeId: true
      }
    })

    const today = new Date()
    const in30Days = new Date(today)
    in30Days.setDate(today.getDate() + 30)
    const currentYear = today.getFullYear()

    const birthdays = []
    const anniversaries = []

    for (const user of users) {
      // Check birthday
      if (user.dateOfBirth) {
        const bday = new Date(user.dateOfBirth)
        const thisYearBday = new Date(currentYear, bday.getMonth(), bday.getDate())
        const nextYearBday = new Date(currentYear + 1, bday.getMonth(), bday.getDate())
        const upcoming = thisYearBday >= today ? thisYearBday : nextYearBday
        const daysUntil = Math.ceil((upcoming - today) / (1000 * 60 * 60 * 24))
        if (daysUntil <= 30) {
          birthdays.push({
            userId: user.id,
            name: user.name,
            department: user.department,
            date: upcoming.toISOString(),
            daysUntil,
            isToday: daysUntil === 0
          })
        }
      }

      // Check work anniversary
      if (user.dateOfJoining) {
        const joining = new Date(user.dateOfJoining)
        const yearsCompleted = currentYear - joining.getFullYear()
        if (yearsCompleted > 0) {
          const thisYearAnniv = new Date(currentYear, joining.getMonth(), joining.getDate())
          const nextYearAnniv = new Date(currentYear + 1, joining.getMonth(), joining.getDate())
          const upcoming = thisYearAnniv >= today ? thisYearAnniv : nextYearAnniv
          const daysUntil = Math.ceil((upcoming - today) / (1000 * 60 * 60 * 24))
          if (daysUntil <= 30) {
            anniversaries.push({
              userId: user.id,
              name: user.name,
              department: user.department,
              date: upcoming.toISOString(),
              daysUntil,
              years: upcoming.getFullYear() - joining.getFullYear(),
              isToday: daysUntil === 0
            })
          }
        }
      }
    }

    birthdays.sort((a, b) => a.daysUntil - b.daysUntil)
    anniversaries.sort((a, b) => a.daysUntil - b.daysUntil)

    return NextResponse.json({ birthdays, anniversaries })
  } catch (error) {
    console.error('GET /api/birthdays error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
