// ============================================
// NOTIFICATION HELPER UTILITY
// ============================================

import prisma from '@/lib/db'

/**
 * Create a notification for a user
 * @param {Object} params
 * @param {string} params.userId - User ID to notify
 * @param {string} params.title - Short title
 * @param {string} params.message - Full message
 * @param {string} [params.type] - Notification type (info, success, warning, error, leave, task, attendance)
 * @param {string} [params.link] - Optional link to related page
 */
export async function createNotification({ userId, title, message, type = 'info', link = null }) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link
      }
    })
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

/**
 * Create notifications for multiple users
 * @param {Array} notifications - Array of notification objects
 */
export async function createManyNotifications(notifications) {
  try {
    const result = await prisma.notification.createMany({
      data: notifications
    })
    return result
  } catch (error) {
    console.error('Error creating notifications:', error)
    return null
  }
}

/**
 * Notify all HR and Admin users
 * @param {Object} params - Notification params (title, message, type, link)
 */
export async function notifyHRAndAdmins({ title, message, type = 'info', link = null }) {
  try {
    // Find all HR and Admin users
    const hrAdmins = await prisma.user.findMany({
      where: {
        role: { in: ['admin', 'hr'] },
        isActive: true
      },
      select: { id: true }
    })

    if (hrAdmins.length === 0) return null

    // Create notifications for all
    const notifications = hrAdmins.map(user => ({
      userId: user.id,
      title,
      message,
      type,
      link
    }))

    return await createManyNotifications(notifications)
  } catch (error) {
    console.error('Error notifying HR/Admins:', error)
    return null
  }
}

/**
 * Notify a user's manager
 * @param {string} userId - The employee's user ID
 * @param {Object} params - Notification params
 */
export async function notifyManager(userId, { title, message, type = 'info', link = null }) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { managerId: true }
    })

    if (!user?.managerId) return null

    return await createNotification({
      userId: user.managerId,
      title,
      message,
      type,
      link
    })
  } catch (error) {
    console.error('Error notifying manager:', error)
    return null
  }
}

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

export const NotificationTemplates = {
  // Leave notifications
  leaveRequested: (employeeName, leaveType, dates) => ({
    title: 'New Leave Request',
    message: `${employeeName} has requested ${leaveType} for ${dates}`,
    type: 'leave',
    link: '/leave'
  }),

  leaveApproved: (leaveType, dates) => ({
    title: 'Leave Approved ✓',
    message: `Your ${leaveType} request for ${dates} has been approved`,
    type: 'success',
    link: '/leave'
  }),

  leaveRejected: (leaveType, dates, reason = '') => ({
    title: 'Leave Rejected',
    message: `Your ${leaveType} request for ${dates} was rejected${reason ? `: ${reason}` : ''}`,
    type: 'error',
    link: '/leave'
  }),

  // Shift notifications
  shiftAssigned: (shiftName, date) => ({
    title: 'New Shift Assigned',
    message: `You have been assigned to ${shiftName} on ${date}`,
    type: 'info',
    link: '/shifts'
  }),

  shiftUpdated: (shiftName, changes) => ({
    title: 'Shift Updated',
    message: `Your shift "${shiftName}" has been updated: ${changes}`,
    type: 'warning',
    link: '/shifts'
  }),

  // Task notifications
  taskAssigned: (taskName, dueDate = null) => ({
    title: 'New Task Assigned',
    message: `You have been assigned: "${taskName}"${dueDate ? ` (Due: ${dueDate})` : ''}`,
    type: 'task',
    link: '/tasks'
  }),

  taskDueSoon: (taskName, dueDate) => ({
    title: 'Task Due Soon',
    message: `Task "${taskName}" is due on ${dueDate}`,
    type: 'warning',
    link: '/tasks'
  }),

  // Attendance notifications
  attendanceMarked: (status, date) => ({
    title: 'Attendance Recorded',
    message: `Your attendance for ${date} has been marked as ${status}`,
    type: 'attendance',
    link: '/'
  })
}
