'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'  // ⬅️ use default import, no quotes-only import
import { useState } from 'react'
import { useToast } from '@/components/Toast'


export default function ReportGenerator({ onClose }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [reportType, setReportType] = useState('attendance')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [options, setOptions] = useState({
    includeCharts: true,
    includeSummary: true,
    orientation: 'portrait'
  })

  const reportTypes = [
    { 
      id: 'attendance', 
      name: 'Attendance Report', 
      icon: '📅', 
      description: 'Daily attendance records with office/field status',
      color: 'from-blue-500 to-indigo-600'
    },
    { 
      id: 'tasks', 
      name: 'Task Report', 
      icon: '📋', 
      description: 'Task completion status and productivity',
      color: 'from-purple-500 to-pink-600'
    },
    { 
      id: 'leave', 
      name: 'Leave Report', 
      icon: '🏖️', 
      description: 'Leave balance and history',
      color: 'from-green-500 to-emerald-600'
    },
    { 
      id: 'summary', 
      name: 'Summary Report', 
      icon: '📊', 
      description: 'Overall performance summary',
      color: 'from-orange-500 to-red-600'
    }
  ]

  const fetchReportData = async () => {
    const params = new URLSearchParams({
      start: dateRange.start,
      end: dateRange.end
    })

    const responses = await Promise.all([
      fetch(`/api/attendance?${params}`),
      fetch(`/api/tasks?${params}`),
      fetch('/api/leave-balance'),
      fetch('/api/leave-requests')
    ])

    const [attendance, tasks, leaveBalance, leaveRequests] = await Promise.all(
      responses.map(r => r.ok ? r.json() : [])
    )

    return { attendance, tasks, leaveBalance, leaveRequests }
  }

  const generatePDF = async () => {
    setLoading(true)
    
    try {
      const data = await fetchReportData()
      const doc = new jsPDF({
        orientation: options.orientation,
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15

      // Helper functions
      const addHeader = (title) => {
        // Header background
        doc.setFillColor(59, 130, 246)
        doc.rect(0, 0, pageWidth, 35, 'F')
        
        // Company name
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.text('Attendance Monitor', margin, 15)
        
        // Report title
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.text(title, margin, 25)
        
        // Date range
        doc.setFontSize(10)
        doc.text(`Period: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`, margin, 32)
        
        // Generated date on right
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 50, 32)
        
        return 45 // Return Y position after header
      }

      const addFooter = (pageNum, totalPages) => {
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(
          `Page ${pageNum} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
        doc.text(
          'Confidential - For Internal Use Only',
          margin,
          pageHeight - 10
        )
      }

      const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }

      const addSectionTitle = (title, y) => {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 41, 59)
        doc.text(title, margin, y)
        return y + 8
      }

      // Generate report based on type
      switch (reportType) {
        case 'attendance':
          generateAttendanceReport(doc, data, { addHeader, addFooter, addSectionTitle, formatDate, margin, pageWidth })
          break
        case 'tasks':
          generateTaskReport(doc, data, { addHeader, addFooter, addSectionTitle, formatDate, margin, pageWidth })
          break
        case 'leave':
          generateLeaveReport(doc, data, { addHeader, addFooter, addSectionTitle, formatDate, margin, pageWidth })
          break
        case 'summary':
          generateSummaryReport(doc, data, { addHeader, addFooter, addSectionTitle, formatDate, margin, pageWidth })
          break
      }

      // Add footer to all pages
      const totalPages = doc.internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        addFooter(i, totalPages)
      }

      // Save the PDF
      const fileName = `${reportType}-report-${dateRange.start}-to-${dateRange.end}.pdf`
      doc.save(fileName)
      
      toast.success(`${reportTypes.find(r => r.id === reportType)?.name} downloaded!`)
      onClose?.()
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const generateAttendanceReport = (doc, data, helpers) => {
    const { addHeader, addSectionTitle, formatDate, margin, pageWidth } = helpers
    let y = addHeader('Attendance Report')

    // Summary stats
    if (options.includeSummary) {
      y = addSectionTitle('Summary', y)
      
      const totalDays = data.attendance.length
      const officeDays = data.attendance.filter(a => a.status === 'office').length
      const fieldDays = data.attendance.filter(a => a.status === 'field').length
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(71, 85, 105)
      
      const summaryData = [
        ['Total Working Days', totalDays.toString()],
        ['Office Days', `${officeDays} (${totalDays > 0 ? Math.round(officeDays/totalDays*100) : 0}%)`],
        ['Field Days', `${fieldDays} (${totalDays > 0 ? Math.round(fieldDays/totalDays*100) : 0}%)`]
      ]

      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold' } },
        margin: { left: margin, right: margin }
      })

      y = doc.lastAutoTable.finalY + 15
    }

    // Attendance table
    y = addSectionTitle('Attendance Records', y)
    
    const tableData = data.attendance.map(record => [
      formatDate(record.date),
      record.status === 'office' ? '🏢 Office' : '🚗 Field',
      record.session || 'Full Day',
      record.punchIn ? new Date(record.punchIn).toLocaleTimeString() : '-',
      record.punchOut ? new Date(record.punchOut).toLocaleTimeString() : '-',
      record.notes || '-'
    ])

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Status', 'Session', 'Punch In', 'Punch Out', 'Notes']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin }
      })
    } else {
      doc.setFontSize(10)
      doc.setTextColor(128, 128, 128)
      doc.text('No attendance records found for this period.', margin, y + 5)
    }
  }

  const generateTaskReport = (doc, data, helpers) => {
    const { addHeader, addSectionTitle, formatDate, margin } = helpers
    let y = addHeader('Task Report')

    // Summary stats
    if (options.includeSummary) {
      y = addSectionTitle('Summary', y)
      
      const totalTasks = data.tasks.length
      const completedTasks = data.tasks.filter(t => t.completed).length
      const pendingTasks = totalTasks - completedTasks
      const completionRate = totalTasks > 0 ? Math.round(completedTasks/totalTasks*100) : 0
      
      const highPriority = data.tasks.filter(t => t.priority === 'high').length
      const mediumPriority = data.tasks.filter(t => t.priority === 'medium').length
      const lowPriority = data.tasks.filter(t => t.priority === 'low').length

      const summaryData = [
        ['Total Tasks', totalTasks.toString()],
        ['Completed', `${completedTasks} (${completionRate}%)`],
        ['Pending', pendingTasks.toString()],
        ['High Priority', highPriority.toString()],
        ['Medium Priority', mediumPriority.toString()],
        ['Low Priority', lowPriority.toString()]
      ]

      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [147, 51, 234], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold' } },
        margin: { left: margin, right: margin }
      })

      y = doc.lastAutoTable.finalY + 15
    }

    // Tasks table
    y = addSectionTitle('Task List', y)
    
    const tableData = data.tasks.map(task => [
      formatDate(task.date),
      task.title,
      task.type || 'daily',
      task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1) || 'Medium',
      task.completed ? '✅ Done' : '⏳ Pending'
    ])

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Task', 'Type', 'Priority', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [147, 51, 234], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
        columnStyles: {
          1: { cellWidth: 'auto' },
          4: { halign: 'center' }
        }
      })
    } else {
      doc.setFontSize(10)
      doc.setTextColor(128, 128, 128)
      doc.text('No tasks found for this period.', margin, y + 5)
    }
  }

  const generateLeaveReport = (doc, data, helpers) => {
    const { addHeader, addSectionTitle, formatDate, margin } = helpers
    let y = addHeader('Leave Report')

    // Leave Balance
    y = addSectionTitle('Leave Balance', y)
    
    const balanceData = data.leaveBalance.map(b => [
      b.leaveType.name,
      b.leaveType.code,
      b.total.toString(),
      b.used.toString(),
      b.pending.toString(),
      b.available.toString()
    ])

    if (balanceData.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Leave Type', 'Code', 'Total', 'Used', 'Pending', 'Available']],
        body: balanceData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        margin: { left: margin, right: margin }
      })

      y = doc.lastAutoTable.finalY + 15
    }

    // Leave Requests
    y = addSectionTitle('Leave History', y)
    
    const requestData = data.leaveRequests.map(r => [
      formatDate(r.startDate),
      formatDate(r.endDate),
      r.leaveType?.name || '-',
      r.days.toString(),
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
      r.reason || '-'
    ])

    if (requestData.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['From', 'To', 'Type', 'Days', 'Status', 'Reason']],
        body: requestData,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin }
      })
    } else {
      doc.setFontSize(10)
      doc.setTextColor(128, 128, 128)
      doc.text('No leave requests found.', margin, y + 5)
    }
  }

  const generateSummaryReport = (doc, data, helpers) => {
    const { addHeader, addSectionTitle, formatDate, margin, pageWidth } = helpers
    let y = addHeader('Performance Summary Report')

    // Overall Stats
    y = addSectionTitle('Overview', y)
    
    const totalAttendance = data.attendance.length
    const totalTasks = data.tasks.length
    const completedTasks = data.tasks.filter(t => t.completed).length
    const completionRate = totalTasks > 0 ? Math.round(completedTasks/totalTasks*100) : 0
    const officeDays = data.attendance.filter(a => a.status === 'office').length
    const fieldDays = data.attendance.filter(a => a.status === 'field').length

    // Stats boxes
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(margin, y, (pageWidth - margin * 2 - 10) / 3, 25, 3, 3, 'F')
    doc.roundedRect(margin + (pageWidth - margin * 2 - 10) / 3 + 5, y, (pageWidth - margin * 2 - 10) / 3, 25, 3, 3, 'F')
    doc.roundedRect(margin + 2 * ((pageWidth - margin * 2 - 10) / 3 + 5), y, (pageWidth - margin * 2 - 10) / 3, 25, 3, 3, 'F')

    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(59, 130, 246)
    doc.text(totalAttendance.toString(), margin + 10, y + 15)
    doc.text(completedTasks.toString(), margin + (pageWidth - margin * 2 - 10) / 3 + 15, y + 15)
    doc.text(`${completionRate}%`, margin + 2 * ((pageWidth - margin * 2 - 10) / 3 + 5) + 10, y + 15)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Working Days', margin + 10, y + 22)
    doc.text('Tasks Completed', margin + (pageWidth - margin * 2 - 10) / 3 + 15, y + 22)
    doc.text('Completion Rate', margin + 2 * ((pageWidth - margin * 2 - 10) / 3 + 5) + 10, y + 22)

    y += 35

    // Attendance breakdown
    y = addSectionTitle('Attendance Breakdown', y)
    
    const attendanceBreakdown = [
      ['Office Days', officeDays.toString(), `${totalAttendance > 0 ? Math.round(officeDays/totalAttendance*100) : 0}%`],
      ['Field Days', fieldDays.toString(), `${totalAttendance > 0 ? Math.round(fieldDays/totalAttendance*100) : 0}%`],
      ['Total', totalAttendance.toString(), '100%']
    ]

    autoTable(doc, {
      startY: y,
      head: [['Type', 'Days', 'Percentage']],
      body: attendanceBreakdown,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 4 },
      margin: { left: margin, right: margin }
    })

    y = doc.lastAutoTable.finalY + 15

    // Task breakdown by priority
    y = addSectionTitle('Tasks by Priority', y)
    
    const highPriority = data.tasks.filter(t => t.priority === 'high')
    const mediumPriority = data.tasks.filter(t => t.priority === 'medium')
    const lowPriority = data.tasks.filter(t => t.priority === 'low')

    const taskBreakdown = [
      ['High Priority', highPriority.length.toString(), highPriority.filter(t => t.completed).length.toString()],
      ['Medium Priority', mediumPriority.length.toString(), mediumPriority.filter(t => t.completed).length.toString()],
      ['Low Priority', lowPriority.length.toString(), lowPriority.filter(t => t.completed).length.toString()],
      ['Total', totalTasks.toString(), completedTasks.toString()]
    ]

    autoTable(doc, {
      startY: y,
      head: [['Priority', 'Total', 'Completed']],
      body: taskBreakdown,
      theme: 'grid',
      headStyles: { fillColor: [147, 51, 234], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 4 },
      margin: { left: margin, right: margin }
    })

    y = doc.lastAutoTable.finalY + 15

    // Leave summary
    y = addSectionTitle('Leave Summary', y)
    
    const totalLeaveUsed = data.leaveBalance.reduce((sum, b) => sum + b.used, 0)
    const totalLeaveAvailable = data.leaveBalance.reduce((sum, b) => sum + b.available, 0)
    const pendingRequests = data.leaveRequests.filter(r => r.status === 'pending').length
    const approvedRequests = data.leaveRequests.filter(r => r.status === 'approved').length

    const leaveSummary = [
      ['Total Leave Used', `${totalLeaveUsed} days`],
      ['Total Leave Available', `${totalLeaveAvailable} days`],
      ['Pending Requests', pendingRequests.toString()],
      ['Approved Requests', approvedRequests.toString()]
    ]

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: leaveSummary,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold' } },
      margin: { left: margin, right: margin }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-orange-50 to-red-50 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl">📄</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Generate Report</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Download PDF reports</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Report Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {reportTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    reportType === type.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${type.color} rounded-lg flex items-center justify-center text-white`}>
                      <span className="text-xl">{type.icon}</span>
                    </div>
                    <div>
                      <p className={`font-semibold ${reportType === type.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                        {type.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{type.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">From</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">To</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                { label: 'This Week', getValue: () => {
                  const now = new Date()
                  const start = new Date(now.setDate(now.getDate() - now.getDay()))
                  return { start: start.toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] }
                }},
                { label: 'This Month', getValue: () => {
                  const now = new Date()
                  return { 
                    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], 
                    end: new Date().toISOString().split('T')[0] 
                  }
                }},
                { label: 'Last Month', getValue: () => {
                  const now = new Date()
                  return { 
                    start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0], 
                    end: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0] 
                  }
                }},
                { label: 'This Year', getValue: () => {
                  const now = new Date()
                  return { 
                    start: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0], 
                    end: new Date().toISOString().split('T')[0] 
                  }
                }}
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setDateRange(preset.getValue())}
                  className="px-3 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Options
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeSummary}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeSummary: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Include summary statistics</span>
              </label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-700 dark:text-slate-300">Orientation:</span>
                <div className="flex gap-2">
                  {['portrait', 'landscape'].map(o => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOptions(prev => ({ ...prev, orientation: o }))}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        options.orientation === o
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={generatePDF}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}