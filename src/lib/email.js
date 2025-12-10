import { Resend } from 'resend'

const FROM_EMAIL = 'Attendance Monitor <onboarding@resend.dev>'

// For production, use your verified domain:
// const FROM_EMAIL = 'Attendance Monitor <noreply@yourdomain.com>'

// Lazy initialization to prevent build-time errors when RESEND_API_KEY is not set
let resendClient = null
function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export async function sendEmail({ to, subject, html, text }) {
  try {
    const resend = getResendClient()

    if (!resend) {
      console.log('Email skipped - No RESEND_API_KEY configured')
      return { success: false, error: 'Email not configured' }
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text
    })

    if (error) {
      console.error('Email send error:', error)
      return { success: false, error }
    }

    console.log('Email sent successfully:', data?.id)
    return { success: true, data }
  } catch (error) {
    console.error('Email service error:', error)
    return { success: false, error: error.message }
  }
}

// Email Templates
export const emailTemplates = {
  
  // Welcome Email
  welcome: (userName) => ({
    subject: 'Welcome to Attendance Monitor! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome, ${userName}! 👋</h1>
          </div>
          <div class="content">
            <p>Thank you for joining Attendance Monitor. We're excited to have you on board!</p>
            <p>With our platform, you can:</p>
            <ul>
              <li>📅 Track your daily attendance</li>
              <li>📋 Manage your tasks</li>
              <li>🏖️ Apply for leaves</li>
              <li>⏱️ View your time sheets</li>
              <li>📊 Generate reports</li>
            </ul>
            <a href="${process.env.NEXTAUTH_URL}" class="button">Get Started</a>
            <p>If you have any questions, feel free to reach out to your HR team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Attendance Monitor. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Welcome, ${userName}! Thank you for joining Attendance Monitor.`
  }),

  // Leave Request Submitted
  leaveRequestSubmitted: (employeeName, leaveType, startDate, endDate, days, managerName) => ({
    subject: `Leave Request: ${employeeName} - ${leaveType}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6, #a855f7); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #8b5cf6; }
          .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏖️ New Leave Request</h1>
          </div>
          <div class="content">
            <p>Hi ${managerName || 'Manager'},</p>
            <p><strong>${employeeName}</strong> has submitted a leave request:</p>
            <div class="info-box">
              <p><strong>Leave Type:</strong> ${leaveType}</p>
              <p><strong>From:</strong> ${startDate}</p>
              <p><strong>To:</strong> ${endDate}</p>
              <p><strong>Duration:</strong> ${days} day(s)</p>
            </div>
            <a href="${process.env.NEXTAUTH_URL}/leave" class="button">Review Request</a>
            <p>Please review and take action on this request.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Attendance Monitor</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `New leave request from ${employeeName}: ${leaveType} from ${startDate} to ${endDate} (${days} days)`
  }),

  // Leave Approved
  leaveApproved: (employeeName, leaveType, startDate, endDate, approverName) => ({
    subject: `✅ Leave Approved: ${leaveType}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
          .info-box { background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Leave Approved!</h1>
          </div>
          <div class="content">
            <p>Hi ${employeeName},</p>
            <p>Great news! Your leave request has been approved.</p>
            <div class="info-box">
              <p><strong>Leave Type:</strong> ${leaveType}</p>
              <p><strong>From:</strong> ${startDate}</p>
              <p><strong>To:</strong> ${endDate}</p>
              <p><strong>Approved by:</strong> ${approverName}</p>
            </div>
            <p>Enjoy your time off! 🎉</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Attendance Monitor</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your ${leaveType} from ${startDate} to ${endDate} has been approved by ${approverName}.`
  }),

  // Leave Rejected
  leaveRejected: (employeeName, leaveType, startDate, endDate, approverName, reason) => ({
    subject: `❌ Leave Rejected: ${leaveType}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
          .info-box { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Leave Request Declined</h1>
          </div>
          <div class="content">
            <p>Hi ${employeeName},</p>
            <p>Unfortunately, your leave request has been declined.</p>
            <div class="info-box">
              <p><strong>Leave Type:</strong> ${leaveType}</p>
              <p><strong>From:</strong> ${startDate}</p>
              <p><strong>To:</strong> ${endDate}</p>
              <p><strong>Declined by:</strong> ${approverName}</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            <p>Please contact your manager or HR for more information.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Attendance Monitor</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your ${leaveType} from ${startDate} to ${endDate} has been rejected by ${approverName}. ${reason ? 'Reason: ' + reason : ''}`
  }),

  // Daily Attendance Reminder
  attendanceReminder: (employeeName) => ({
    subject: '⏰ Reminder: Mark Your Attendance',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Attendance Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${employeeName},</p>
            <p>This is a friendly reminder to mark your attendance for today.</p>
            <a href="${process.env.NEXTAUTH_URL}" class="button">Mark Attendance Now</a>
            <p>Don't forget to punch out at the end of your work day!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Attendance Monitor</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${employeeName}, this is a reminder to mark your attendance for today.`
  }),

  // Weekly Summary
  weeklySummary: (employeeName, stats) => ({
    subject: '📊 Your Weekly Attendance Summary',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
          .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .stat-box { background: white; padding: 20px; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 28px; font-weight: bold; color: #3b82f6; }
          .stat-label { font-size: 12px; color: #64748b; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Weekly Summary</h1>
            <p>${stats.weekRange}</p>
          </div>
          <div class="content">
            <p>Hi ${employeeName},</p>
            <p>Here's your attendance summary for the week:</p>
            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-value">${stats.daysPresent}</div>
                <div class="stat-label">Days Present</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${stats.totalHours}h</div>
                <div class="stat-label">Total Hours</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${stats.tasksCompleted}</div>
                <div class="stat-label">Tasks Completed</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${stats.onTimePercentage}%</div>
                <div class="stat-label">On-Time Rate</div>
              </div>
            </div>
            <p>Keep up the great work! 💪</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Attendance Monitor</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Weekly Summary for ${employeeName}: ${stats.daysPresent} days present, ${stats.totalHours} hours worked, ${stats.tasksCompleted} tasks completed.`
  }),

  // Password Reset
  passwordReset: (userName, resetLink) => ({
    subject: '🔐 Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .warning { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${resetLink}" class="button">Reset Password</a>
            <div class="warning">
              <p><strong>⚠️ Important:</strong> This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Attendance Monitor</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${userName}, click here to reset your password: ${resetLink}. This link expires in 1 hour.`
  })
}

// Send specific email types
export async function sendWelcomeEmail(to, userName) {
  const template = emailTemplates.welcome(userName)
  return sendEmail({ to, ...template })
}

export async function sendLeaveRequestEmail(to, employeeName, leaveType, startDate, endDate, days, managerName) {
  const template = emailTemplates.leaveRequestSubmitted(employeeName, leaveType, startDate, endDate, days, managerName)
  return sendEmail({ to, ...template })
}

export async function sendLeaveApprovedEmail(to, employeeName, leaveType, startDate, endDate, approverName) {
  const template = emailTemplates.leaveApproved(employeeName, leaveType, startDate, endDate, approverName)
  return sendEmail({ to, ...template })
}

export async function sendLeaveRejectedEmail(to, employeeName, leaveType, startDate, endDate, approverName, reason) {
  const template = emailTemplates.leaveRejected(employeeName, leaveType, startDate, endDate, approverName, reason)
  return sendEmail({ to, ...template })
}

export async function sendAttendanceReminderEmail(to, employeeName) {
  const template = emailTemplates.attendanceReminder(employeeName)
  return sendEmail({ to, ...template })
}

export async function sendWeeklySummaryEmail(to, employeeName, stats) {
  const template = emailTemplates.weeklySummary(employeeName, stats)
  return sendEmail({ to, ...template })
}

export async function sendPasswordResetEmail(to, userName, resetLink) {
  const template = emailTemplates.passwordReset(userName, resetLink)
  return sendEmail({ to, ...template })
}