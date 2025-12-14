'use client'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'
import NotificationBell from '@/components/NotificationBell'
import { useToast } from '@/components/Toast'

export default function PayrollExport() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [payrollData, setPayrollData] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  })
  const [exportFormat, setExportFormat] = useState('csv')
  const [selectedEmployees, setSelectedEmployees] = useState([])

  // Configuration
  const [config, setConfig] = useState({
    workingDaysPerMonth: 22,
    standardHoursPerDay: 8,
    overtimeRate: 1.5,
    lateDeductionPerInstance: 50,
    absentDeductionPerDay: 500,
    currency: 'INR'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (!['admin', 'hr'].includes(session?.user?.role)) {
        router.push('/')
        toast.error('Access denied')
      } else {
        fetchPayrollData()
      }
    }
  }, [status, session, router, selectedMonth])

  const fetchPayrollData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/payroll?month=' + selectedMonth)
      if (res.ok) {
        const data = await res.json()
        setPayrollData(data)
        setSelectedEmployees(data.map(d => d.userId))
      }
    } catch (error) {
      console.error('Error fetching payroll data:', error)
      toast.error('Failed to load payroll data')
    } finally {
      setLoading(false)
    }
  }

  const calculatePayroll = (employee) => {
    const { workingDaysPerMonth, standardHoursPerDay, overtimeRate, lateDeductionPerInstance, absentDeductionPerDay } = config

    const totalWorkHours = employee.totalHours || 0
    const expectedHours = workingDaysPerMonth * standardHoursPerDay
    const overtimeHours = Math.max(0, totalWorkHours - expectedHours)
    const regularHours = Math.min(totalWorkHours, expectedHours)
    const absentDays = Math.max(0, workingDaysPerMonth - (employee.daysPresent || 0))
    const lateInstances = employee.lateArrivals || 0

    // Calculate deductions
    const absentDeduction = absentDays * absentDeductionPerDay
    const lateDeduction = lateInstances * lateDeductionPerInstance
    const totalDeductions = absentDeduction + lateDeduction

    // Calculate overtime pay (as bonus)
    const overtimePay = overtimeHours * (employee.hourlyRate || 0) * overtimeRate

    return {
      regularHours: regularHours.toFixed(1),
      overtimeHours: overtimeHours.toFixed(1),
      absentDays,
      lateInstances,
      absentDeduction,
      lateDeduction,
      totalDeductions,
      overtimePay: overtimePay.toFixed(2),
      netAdjustment: (overtimePay - totalDeductions).toFixed(2)
    }
  }

  const handleExport = async () => {
    if (selectedEmployees.length === 0) {
      toast.warning('Please select at least one employee')
      return
    }

    setExporting(true)

    try {
      const filteredData = payrollData.filter(d => selectedEmployees.includes(d.userId))
      
      if (exportFormat === 'csv') {
        exportToCSV(filteredData)
      } else if (exportFormat === 'excel') {
        exportToExcel(filteredData)
      } else if (exportFormat === 'pdf') {
        await exportToPDF(filteredData)
      }

      toast.success('Payroll exported successfully!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export payroll')
    } finally {
      setExporting(false)
    }
  }

  const exportToCSV = (data) => {
    const headers = [
      'Employee ID', 'Name', 'Department', 'Days Present', 'Days Absent',
      'Late Arrivals', 'Total Hours', 'Regular Hours', 'Overtime Hours',
      'Absent Deduction', 'Late Deduction', 'Total Deductions',
      'Overtime Pay', 'Net Adjustment'
    ]

    const rows = data.map(emp => {
      const calc = calculatePayroll(emp)
      return [
        emp.employeeId || '',
        emp.name,
        emp.department || '',
        emp.daysPresent || 0,
        calc.absentDays,
        calc.lateInstances,
        (emp.totalHours || 0).toFixed(1),
        calc.regularHours,
        calc.overtimeHours,
        calc.absentDeduction,
        calc.lateDeduction,
        calc.totalDeductions,
        calc.overtimePay,
        calc.netAdjustment
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    downloadFile(csvContent, 'payroll-' + selectedMonth + '.csv', 'text/csv')
  }

  const exportToExcel = (data) => {
    // For Excel, we'll use CSV with .xlsx extension (basic)
    // For proper Excel, you'd need a library like xlsx
    const headers = [
      'Employee ID', 'Name', 'Department', 'Days Present', 'Days Absent',
      'Late Arrivals', 'Total Hours', 'Regular Hours', 'Overtime Hours',
      'Absent Deduction', 'Late Deduction', 'Total Deductions',
      'Overtime Pay', 'Net Adjustment'
    ]

    const rows = data.map(emp => {
      const calc = calculatePayroll(emp)
      return [
        emp.employeeId || '',
        emp.name,
        emp.department || '',
        emp.daysPresent || 0,
        calc.absentDays,
        calc.lateInstances,
        (emp.totalHours || 0).toFixed(1),
        calc.regularHours,
        calc.overtimeHours,
        calc.absentDeduction,
        calc.lateDeduction,
        calc.totalDeductions,
        calc.overtimePay,
        calc.netAdjustment
      ].join('\t')
    })

    const content = [headers.join('\t'), ...rows].join('\n')
    downloadFile(content, 'payroll-' + selectedMonth + '.xls', 'application/vnd.ms-excel')
  }

  const exportToPDF = async (data) => {
    // Dynamic import of jsPDF
    const { jsPDF } = await import('jspdf')
    await import('jspdf-autotable')

    const doc = new jsPDF('landscape')
    
    // Title
    doc.setFontSize(18)
    doc.text('Payroll Report - ' + selectedMonth, 14, 22)
    
    doc.setFontSize(10)
    doc.text('Generated on: ' + new Date().toLocaleString(), 14, 30)

    // Table
    const tableData = data.map(emp => {
      const calc = calculatePayroll(emp)
      return [
        emp.employeeId || '-',
        emp.name,
        emp.department || '-',
        emp.daysPresent || 0,
        calc.absentDays,
        calc.lateInstances,
        (emp.totalHours || 0).toFixed(1),
        calc.overtimeHours,
        config.currency + ' ' + calc.totalDeductions,
        config.currency + ' ' + calc.overtimePay,
        config.currency + ' ' + calc.netAdjustment
      ]
    })

    doc.autoTable({
      head: [[
        'Emp ID', 'Name', 'Dept', 'Present', 'Absent', 'Late',
        'Total Hrs', 'OT Hrs', 'Deductions', 'OT Pay', 'Net Adj'
      ]],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    })

    doc.save('payroll-' + selectedMonth + '.pdf')
  }

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleSelectAll = () => {
    if (selectedEmployees.length === payrollData.length) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(payrollData.map(d => d.userId))
    }
  }

  const toggleEmployee = (userId) => {
    if (selectedEmployees.includes(userId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== userId))
    } else {
      setSelectedEmployees([...selectedEmployees, userId])
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-400/20 dark:bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <header className="mb-8">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Payroll Export</h1>
                  <p className="text-slate-500 dark:text-slate-400">Generate payroll reports</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white"
                />
                <DarkModeToggle />
                <NotificationBell />
                <UserNav />
              </div>
            </div>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{payrollData.length}</div>
            <div className="text-xs text-slate-500">Employees</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="text-3xl font-bold text-emerald-600">{payrollData.reduce((sum, e) => sum + (e.totalHours || 0), 0).toFixed(0)}h</div>
            <div className="text-xs text-slate-500">Total Hours</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="text-3xl font-bold text-amber-600">{payrollData.reduce((sum, e) => sum + (e.lateArrivals || 0), 0)}</div>
            <div className="text-xs text-slate-500">Late Arrivals</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="text-3xl font-bold text-blue-600">{selectedEmployees.length}</div>
            <div className="text-xs text-slate-500">Selected</div>
          </div>
        </div>

        {/* Export Controls */}
        <div className="mb-6 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Export as:</span>
              <div className="flex gap-2">
                {['csv', 'excel', 'pdf'].map(format => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={'px-4 py-2 rounded-xl text-sm font-medium transition-all uppercase ' + (
                      exportFormat === format
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting || selectedEmployees.length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Payroll
                </>
              )}
            </button>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.length === payrollData.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Dept</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Present</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Absent</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Late</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Hours</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">OT Hrs</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Deductions</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">OT Pay</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Net Adj</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {payrollData.map(emp => {
                  const calc = calculatePayroll(emp)
                  const isSelected = selectedEmployees.includes(emp.userId)
                  
                  return (
                    <tr 
                      key={emp.userId} 
                      className={'transition-colors ' + (isSelected ? 'bg-green-50 dark:bg-green-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50')}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEmployee(emp.userId)}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                            {emp.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white text-sm">{emp.name}</p>
                            <p className="text-xs text-slate-500">{emp.employeeId || 'No ID'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{emp.department || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium">
                          {emp.daysPresent || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={'px-2 py-1 rounded-lg text-sm font-medium ' + (
                          calc.absentDays > 0 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        )}>
                          {calc.absentDays}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={'px-2 py-1 rounded-lg text-sm font-medium ' + (
                          calc.lateInstances > 0
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        )}>
                          {calc.lateInstances}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-400">
                        {(emp.totalHours || 0).toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={'text-sm font-medium ' + (
                          parseFloat(calc.overtimeHours) > 0 ? 'text-blue-600' : 'text-slate-400'
                        )}>
                          {calc.overtimeHours}h
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={'text-sm font-medium ' + (
                          calc.totalDeductions > 0 ? 'text-red-600' : 'text-slate-400'
                        )}>
                          {calc.totalDeductions > 0 ? '-' + config.currency + ' ' + calc.totalDeductions : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={'text-sm font-medium ' + (
                          parseFloat(calc.overtimePay) > 0 ? 'text-emerald-600' : 'text-slate-400'
                        )}>
                          {parseFloat(calc.overtimePay) > 0 ? '+' + config.currency + ' ' + calc.overtimePay : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={'text-sm font-bold ' + (
                          parseFloat(calc.netAdjustment) >= 0 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-red-600 dark:text-red-400'
                        )}>
                          {parseFloat(calc.netAdjustment) >= 0 ? '+' : ''}{config.currency} {calc.netAdjustment}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}