import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { sendEmail, emailTemplates } from '@/lib/email'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/hr can send manual emails
    if (session.user.role !== 'admin' && session.user.role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { type, to, data } = body

    let template
    switch (type) {
      case 'welcome':
        template = emailTemplates.welcome(data.userName)
        break
      case 'attendanceReminder':
        template = emailTemplates.attendanceReminder(data.employeeName)
        break
      case 'weeklySummary':
        template = emailTemplates.weeklySummary(data.employeeName, data.stats)
        break
      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
    }

    const result = await sendEmail({ to, ...template })

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Email sent successfully' })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}