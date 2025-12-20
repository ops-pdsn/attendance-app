'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'
import NotificationBell from '@/components/NotificationBell'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'

export const dynamic = 'force-dynamic'

export default function PayrollExport() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()
  const { confirm } = useConfirm()

  const [loading, setLoading] = useState(true)
  const [payrollData, setPayrollData] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [exporting, setExporting] = useState(false)

  // Employee custom details
  const [employeeDetails, setEmployeeDetails] = useState({})

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (!['admin', 'hr'].includes(session.user.role)) {
        toast.error('Access denied. Admin/HR role required.')
        router.push('/')
        return
      }
      initializeDates()
      fetchPayrollData()
    }
  }, [status, router, session])

  const initializeDates = () => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }

  const fetchPayrollData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll?startDate=${startDate || ''}&endDate=${endDate || ''}`)
      if (res.ok) {
        const data = await res.json()
        setPayrollData(data)
        setSelectedEmployees(data.map(e => e.userId))
        // Initialize employee details
        const details = {}
        data.forEach(emp => {
          details[emp.userId] = {
            hourlyRate: emp.hourlyRate || 0,
            bonus: 0,
            deductions: 0,
            allowances: 0,
            overtime: 0,
            notes: ''
          }
        })
        setEmployeeDetails(details)
      }
    } catch (error) {
      console.error('Error fetching payroll:', error)
      toast.error('Failed to load payroll data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (startDate && endDate && status === 'authenticated') {
      fetchPayrollData()
    }
  }, [startDate, endDate])

  const handleSelectEmployee = (userId) => {
    setSelectedEmployees(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    if (selectedEmployees.length === payrollData.length) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(payrollData.map(e => e.userId))
    }
  }

  const openEmployeeDetails = (employee) => {
    setEditingEmployee(employee)
    setShowEmployeeModal(true)
  }

  const saveEmployeeDetails = (userId, details) => {
    setEmployeeDetails(prev => ({
      ...prev,
      [userId]: details
    }))
    setShowEmployeeModal(false)
    toast.success('Employee details saved')
  }

  const calculateGrossPay = (employee) => {
    const details = employeeDetails[employee.userId] || {}
    const basePay = employee.totalHours * (details.hourlyRate || 0)
    const overtime = details.overtime || 0
    const bonus = details.bonus || 0
    const allowances = details.allowances || 0
    return basePay + overtime + bonus + allowances
  }

  const calculateNetPay = (employee) => {
    const gross = calculateGrossPay(employee)
    const details = employeeDetails[employee.userId] || {}
    const deductions = details.deductions || 0
    return gross - deductions
  }

  const exportToCSV = () => {
    setExporting(true)
    try {
      const selectedData = payrollData.filter(e => selectedEmployees.includes(e.userId))
      
      const headers = [
        'Employee ID',
        'Name',
        'Email',
        'Department',
        'Days Present',
        'Total Hours',
        'Late Arrivals',
        'Hourly Rate',
        'Base Pay',
        'Overtime',
        'Bonus',
        'Allowances',
        'Gross Pay',
        'Deductions',
        'Net Pay',
        'Notes'
      ]

      const rows = selectedData.map(emp => {
        const details = employeeDetails[emp.userId] || {}
        const basePay = emp.totalHours * (details.hourlyRate || 0)
        const grossPay = calculateGrossPay(emp)
        const netPay = calculateNetPay(emp)

        return [
          emp.employeeId || '-',
          emp.name,
          emp.email,
          emp.department || '-',
          emp.daysPresent,
          emp.totalHours.toFixed(2),
          emp.lateArrivals,
          details.hourlyRate || 0,
          basePay.toFixed(2),
          details.overtime || 0,
          details.bonus || 0,
          details.allowances || 0,
          grossPay.toFixed(2),
          details.deductions || 0,
          netPay.toFixed(2),
          details.notes || ''
        ]
      })

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll-${startDate}-to-${endDate}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Payroll exported to CSV!')
    } catch (error) {
      toast.error('Failed to export')
    } finally {
      setExporting(false)
    }
  }

  const exportToExcel = async () => {
    setExporting(true)
    try {
      // Export as CSV with .xlsx extension hint for Excel compatibility
      const selectedData = payrollData.filter(e => selectedEmployees.includes(e.userId))
      
      const headers = [
        'Employee ID',
        'Name',
        'Email',
        'Department',
        'Days Present',
        'Total Hours',
        'Late Arrivals',
        'Hourly Rate',
        'Base Pay',
        'Overtime',
        'Bonus',
        'Allowances',
        'Gross Pay',
        'Deductions',
        'Net Pay',
        'Notes'
      ]

      const rows = selectedData.map(emp => {
        const details = employeeDetails[emp.userId] || {}
        const basePay = emp.totalHours * (details.hourlyRate || 0)
        const grossPay = calculateGrossPay(emp)
        const netPay = calculateNetPay(emp)

        return [
          emp.employeeId || '-',
          emp.name,
          emp.email,
          emp.department || '-',
          emp.daysPresent,
          emp.totalHours.toFixed(2),
          emp.lateArrivals,
          details.hourlyRate || 0,
          basePay.toFixed(2),
          details.overtime || 0,
          details.bonus || 0,
          details.allowances || 0,
          grossPay.toFixed(2),
          details.deductions || 0,
          netPay.toFixed(2),
          `"${(details.notes || '').replace(/"/g, '""')}"`
        ]
      })

      // Create CSV content (Excel can open CSV files)
      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
      
      // Add BOM for Excel to recognize UTF-8
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll-${startDate}-to-${endDate}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Payroll exported! (Open with Excel)')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export')
    } finally {
      setExporting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const totalGrossPay = payrollData
    .filter(e => selectedEmployees.includes(e.userId))
    .reduce((sum, e) => sum + calculateGrossPay(e), 0)

  const totalNetPay = payrollData
    .filter(e => selectedEmployees.includes(e.userId))
    .reduce((sum, e) => sum + calculateNetPay(e), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-green-400/20 dark:bg-green-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Header */}
        <header className="mb-4 sm:mb-6">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl p-3 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              {/* Title */}
              <div className="flex items-center gap-3">
                <Link href="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl sm:text-2xl">💰</span>
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Payroll Export</h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Generate payroll reports</p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <DarkModeToggle />
                <NotificationBell />
                <UserNav />
              </div>
            </div>
          </div>
        </header>

        {/* Date Range & Export */}
        <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                disabled={exporting || selectedEmployees.length === 0}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>📄</span>
                <span className="hidden sm:inline">Export</span> CSV
              </button>
              <button
                onClick={exportToExcel}
                disabled={exporting || selectedEmployees.length === 0}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>📊</span>
                    <span className="hidden sm:inline">Export</span> Excel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <p className="text-xs text-slate-500 mb-1">Selected</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{selectedEmployees.length} / {payrollData.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <p className="text-xs text-slate-500 mb-1">Total Hours</p>
            <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
              {payrollData.filter(e => selectedEmployees.includes(e.userId)).reduce((sum, e) => sum + e.totalHours, 0).toFixed(1)}h
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <p className="text-xs text-slate-500 mb-1">Gross Pay</p>
            <p className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">₹{totalGrossPay.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <p className="text-xs text-slate-500 mb-1">Net Pay</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">₹{totalNetPay.toLocaleString()}</p>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedEmployees.length === payrollData.length && payrollData.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Select All</span>
              </label>
            </div>
            <span className="text-xs text-slate-500">{selectedEmployees.length} selected</span>
          </div>

          {/* Employee Cards (Mobile) / Table (Desktop) */}
          <div className="sm:hidden divide-y divide-slate-200 dark:divide-slate-700">
            {payrollData.map(employee => {
              const details = employeeDetails[employee.userId] || {}
              const isSelected = selectedEmployees.includes(employee.userId)
              const grossPay = calculateGrossPay(employee)
              const netPay = calculateNetPay(employee)

              return (
                <div key={employee.userId} className={`p-3 ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}>
                  <div className="flex items-start gap-3">
                    <label className="flex items-center mt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectEmployee(employee.userId)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                      />
                    </label>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{employee.name}</p>
                        <button
                          onClick={() => openEmployeeDetails(employee)}
                          className="p-1 text-slate-400 hover:text-emerald-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">{employee.department || 'No dept'} • {employee.employeeId || 'No ID'}</p>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        <div>
                          <p className="text-slate-400">Days</p>
                          <p className="font-medium text-slate-700 dark:text-slate-300">{employee.daysPresent}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Hours</p>
                          <p className="font-medium text-slate-700 dark:text-slate-300">{employee.totalHours.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Late</p>
                          <p className="font-medium text-red-600">{employee.lateArrivals}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2">
                          <p className="text-slate-400">Gross</p>
                          <p className="font-bold text-amber-600">₹{grossPay.toLocaleString()}</p>
                        </div>
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-2">
                          <p className="text-slate-400">Net</p>
                          <p className="font-bold text-emerald-600">₹{netPay.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="w-10 px-4 py-3"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Dept</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Days</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Hours</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Late</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Rate/hr</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Gross</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Net</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {payrollData.map(employee => {
                  const details = employeeDetails[employee.userId] || {}
                  const isSelected = selectedEmployees.includes(employee.userId)
                  const grossPay = calculateGrossPay(employee)
                  const netPay = calculateNetPay(employee)

                  return (
                    <tr key={employee.userId} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectEmployee(employee.userId)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white text-sm">{employee.name}</p>
                          <p className="text-xs text-slate-500">{employee.employeeId || 'No ID'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{employee.department || '-'}</td>
                      <td className="px-4 py-3 text-center text-sm font-medium">{employee.daysPresent}</td>
                      <td className="px-4 py-3 text-center text-sm font-medium">{employee.totalHours.toFixed(1)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${employee.lateArrivals > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                          {employee.lateArrivals}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">₹{details.hourlyRate || 0}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-amber-600">₹{grossPay.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">₹{netPay.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openEmployeeDetails(employee)}
                          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {payrollData.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl">💰</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium text-sm sm:text-base">No payroll data found</p>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">Select a date range to view payroll</p>
            </div>
          )}
        </div>
      </div>

      {/* Employee Details Modal */}
      {showEmployeeModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50 dark:from-slate-800 dark:to-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                  {editingEmployee.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-none">{editingEmployee.name}</h2>
                  <p className="text-xs text-slate-500">{editingEmployee.department || 'No dept'}</p>
                </div>
              </div>
              <button onClick={() => setShowEmployeeModal(false)} className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 rounded-xl">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Attendance Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Days</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{editingEmployee.daysPresent}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Hours</p>
                  <p className="text-lg font-bold text-blue-600">{editingEmployee.totalHours.toFixed(1)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Late</p>
                  <p className="text-lg font-bold text-red-600">{editingEmployee.lateArrivals}</p>
                </div>
              </div>

              {/* Pay Details Form */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    value={employeeDetails[editingEmployee.userId]?.hourlyRate || 0}
                    onChange={(e) => setEmployeeDetails(prev => ({
                      ...prev,
                      [editingEmployee.userId]: {
                        ...prev[editingEmployee.userId],
                        hourlyRate: parseFloat(e.target.value) || 0
                      }
                    }))}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Overtime (₹)</label>
                    <input
                      type="number"
                      value={employeeDetails[editingEmployee.userId]?.overtime || 0}
                      onChange={(e) => setEmployeeDetails(prev => ({
                        ...prev,
                        [editingEmployee.userId]: {
                          ...prev[editingEmployee.userId],
                          overtime: parseFloat(e.target.value) || 0
                        }
                      }))}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bonus (₹)</label>
                    <input
                      type="number"
                      value={employeeDetails[editingEmployee.userId]?.bonus || 0}
                      onChange={(e) => setEmployeeDetails(prev => ({
                        ...prev,
                        [editingEmployee.userId]: {
                          ...prev[editingEmployee.userId],
                          bonus: parseFloat(e.target.value) || 0
                        }
                      }))}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Allowances (₹)</label>
                    <input
                      type="number"
                      value={employeeDetails[editingEmployee.userId]?.allowances || 0}
                      onChange={(e) => setEmployeeDetails(prev => ({
                        ...prev,
                        [editingEmployee.userId]: {
                          ...prev[editingEmployee.userId],
                          allowances: parseFloat(e.target.value) || 0
                        }
                      }))}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deductions (₹)</label>
                    <input
                      type="number"
                      value={employeeDetails[editingEmployee.userId]?.deductions || 0}
                      onChange={(e) => setEmployeeDetails(prev => ({
                        ...prev,
                        [editingEmployee.userId]: {
                          ...prev[editingEmployee.userId],
                          deductions: parseFloat(e.target.value) || 0
                        }
                      }))}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                  <textarea
                    value={employeeDetails[editingEmployee.userId]?.notes || ''}
                    onChange={(e) => setEmployeeDetails(prev => ({
                      ...prev,
                      [editingEmployee.userId]: {
                        ...prev[editingEmployee.userId],
                        notes: e.target.value
                      }
                    }))}
                    rows={2}
                    placeholder="Add notes..."
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0 focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                {/* Pay Preview */}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Gross Pay</span>
                    <span className="font-bold text-amber-600">₹{calculateGrossPay(editingEmployee).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Net Pay</span>
                    <span className="font-bold text-emerald-600">₹{calculateNetPay(editingEmployee).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success('Details saved!')
                  setShowEmployeeModal(false)
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-medium"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}