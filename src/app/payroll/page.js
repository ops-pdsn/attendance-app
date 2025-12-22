'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'
import ProtectedPage from '@/components/ProtectedPage'

export const dynamic = 'force-dynamic'

export default function PayrollPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showSalaryModal, setShowSalaryModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState(null)

  // Salary form state
  const [salaryForm, setSalaryForm] = useState({
    basicSalary: 0, hra: 0, da: 0, conveyance: 0, medicalAllowance: 0,
    specialAllowance: 0, bonus: 0, overtime: 0, otherEarnings: 0,
    pf: 0, esi: 0, professionalTax: 0, tds: 0, loanDeduction: 0, otherDeductions: 0,
    workingDays: 26, presentDays: 26, lopDays: 0, notes: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      // REMOVED old role check - ProtectedPage handles permissions now
      fetchEmployees()
    }
  }, [status, router, session])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        const employeesWithSalary = data.map(emp => ({
          ...emp,
          salary: {
            basicSalary: 25000, hra: 10000, da: 5000, conveyance: 1600,
            medicalAllowance: 1250, specialAllowance: 5000, bonus: 0,
            overtime: 0, otherEarnings: 0, pf: 1800, esi: 0,
            professionalTax: 200, tds: 0, loanDeduction: 0, otherDeductions: 0,
            workingDays: 26, presentDays: 24, lopDays: 2
          }
        }))
        setEmployees(employeesWithSalary)
      }
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to fetch employees', 'error')
    } finally {
      setLoading(false)
    }
  }

  const calculateTotalEarnings = (salary) => {
    return (salary.basicSalary || 0) + (salary.hra || 0) + (salary.da || 0) +
      (salary.conveyance || 0) + (salary.medicalAllowance || 0) +
      (salary.specialAllowance || 0) + (salary.bonus || 0) +
      (salary.overtime || 0) + (salary.otherEarnings || 0)
  }

  const calculateTotalDeductions = (salary) => {
    return (salary.pf || 0) + (salary.esi || 0) + (salary.professionalTax || 0) +
      (salary.tds || 0) + (salary.loanDeduction || 0) + (salary.otherDeductions || 0)
  }

  const calculateNetSalary = (salary) => {
    const gross = calculateTotalEarnings(salary)
    const deductions = calculateTotalDeductions(salary)
    const lopDeduction = salary.lopDays > 0 
      ? Math.round((salary.basicSalary / salary.workingDays) * salary.lopDays) : 0
    return gross - deductions - lopDeduction
  }

  const openSalaryModal = (employee) => {
    setSelectedEmployee(employee)
    setSalaryForm(employee.salary || {
      basicSalary: 0, hra: 0, da: 0, conveyance: 0, medicalAllowance: 0,
      specialAllowance: 0, bonus: 0, overtime: 0, otherEarnings: 0,
      pf: 0, esi: 0, professionalTax: 0, tds: 0, loanDeduction: 0,
      otherDeductions: 0, workingDays: 26, presentDays: 26, lopDays: 0, notes: ''
    })
    setShowSalaryModal(true)
  }

  const handleSalaryChange = (field, value) => {
    setSalaryForm(prev => ({ ...prev, [field]: parseFloat(value) || 0 }))
  }

  const saveSalary = () => {
    setEmployees(prev => prev.map(emp => 
      emp.id === selectedEmployee.id ? { ...emp, salary: { ...salaryForm } } : emp
    ))
    setShowSalaryModal(false)
    showToast('Salary details saved!')
  }

  const exportToCSV = () => {
    setExporting(true)
    try {
      const headers = [
        'Employee ID', 'Name', 'Email', 'Department',
        'Basic', 'HRA', 'DA', 'Conveyance', 'Medical', 'Special Allowance',
        'Bonus', 'Overtime', 'Other Earnings', 'Gross Salary',
        'PF', 'ESI', 'Prof. Tax', 'TDS', 'Loan', 'Other Deductions',
        'Total Deductions', 'Working Days', 'Present Days', 'LOP Days',
        'LOP Deduction', 'Net Salary'
      ]

      const rows = filteredEmployees.map(emp => {
        const s = emp.salary
        const gross = calculateTotalEarnings(s)
        const totalDeductions = calculateTotalDeductions(s)
        const lopDeduction = s.lopDays > 0 ? Math.round((s.basicSalary / s.workingDays) * s.lopDays) : 0
        const netSalary = gross - totalDeductions - lopDeduction

        return [
          emp.employeeId || '-', emp.name, emp.email, emp.department || '-',
          s.basicSalary, s.hra, s.da, s.conveyance, s.medicalAllowance, s.specialAllowance,
          s.bonus, s.overtime, s.otherEarnings, gross,
          s.pf, s.esi, s.professionalTax, s.tds, s.loanDeduction, s.otherDeductions,
          totalDeductions, s.workingDays, s.presentDays, s.lopDays, lopDeduction, netSalary
        ]
      })

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll-${selectedMonth}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Payroll exported successfully!')
    } catch (error) {
      showToast('Export failed', 'error')
    } finally {
      setExporting(false)
    }
  }

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(amount)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <ProtectedPage module="payroll" action="read">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className={`px-4 py-3 rounded-xl shadow-lg ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
          }`}>
            {toast.message}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <header className="mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link href="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Payroll Management</h1>
                  <p className="text-sm text-slate-500">Manage employee salaries and generate payslips</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DarkModeToggle />
                <UserNav />
              </div>
            </div>
          </div>
        </header>

        {/* Filters & Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white text-sm"
              />
              <button
                onClick={exportToCSV}
                disabled={exporting || filteredEmployees.length === 0}
                className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
              >
                {exporting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 mb-1">Total Employees</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{filteredEmployees.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 mb-1">Total Gross</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">
              {formatCurrency(filteredEmployees.reduce((sum, emp) => sum + calculateTotalEarnings(emp.salary), 0))}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 mb-1">Total Deductions</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600">
              {formatCurrency(filteredEmployees.reduce((sum, emp) => sum + calculateTotalDeductions(emp.salary), 0))}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 mb-1">Total Net Payable</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600">
              {formatCurrency(filteredEmployees.reduce((sum, emp) => sum + calculateNetSalary(emp.salary), 0))}
            </p>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Department</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Basic</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Gross</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Deductions</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Net Salary</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {emp.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white text-sm">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.employeeId || emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{emp.department || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-white">{formatCurrency(emp.salary.basicSalary)}</td>
                    <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">{formatCurrency(calculateTotalEarnings(emp.salary))}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(calculateTotalDeductions(emp.salary))}</td>
                    <td className="px-4 py-3 text-sm text-right text-emerald-600 font-semibold">{formatCurrency(calculateNetSalary(emp.salary))}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openSalaryModal(emp)}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      >
                        Edit Salary
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-700">
            {filteredEmployees.map(emp => (
              <div key={emp.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                      {emp.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{emp.name}</p>
                      <p className="text-xs text-slate-500">{emp.department || 'No department'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openSalaryModal(emp)}
                    className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                    <p className="text-xs text-slate-500">Gross</p>
                    <p className="text-sm font-semibold text-blue-600">{formatCurrency(calculateTotalEarnings(emp.salary))}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                    <p className="text-xs text-slate-500">Deduct</p>
                    <p className="text-sm font-semibold text-red-600">{formatCurrency(calculateTotalDeductions(emp.salary))}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                    <p className="text-xs text-slate-500">Net</p>
                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(calculateNetSalary(emp.salary))}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-slate-500">No employees found</p>
            </div>
          )}
        </div>
      </div>

      {/* Salary Edit Modal */}
      {showSalaryModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Edit Salary</h2>
                <p className="text-sm text-slate-500">{selectedEmployee.name} - {selectedMonth}</p>
              </div>
              <button onClick={() => setShowSalaryModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Attendance */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Attendance</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Working Days</label>
                    <input type="number" value={salaryForm.workingDays} onChange={(e) => handleSalaryChange('workingDays', e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Present Days</label>
                    <input type="number" value={salaryForm.presentDays} onChange={(e) => handleSalaryChange('presentDays', e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">LOP Days</label>
                    <input type="number" value={salaryForm.lopDays} onChange={(e) => handleSalaryChange('lopDays', e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" />
                  </div>
                </div>
              </div>

              {/* Earnings */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-emerald-600 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>Earnings
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    ['basicSalary', 'Basic Salary'], ['hra', 'HRA'], ['da', 'DA'],
                    ['conveyance', 'Conveyance'], ['medicalAllowance', 'Medical'], ['specialAllowance', 'Special Allowance'],
                    ['bonus', 'Bonus'], ['overtime', 'Overtime'], ['otherEarnings', 'Other Earnings']
                  ].map(([field, label]) => (
                    <div key={field}>
                      <label className="block text-xs text-slate-500 mb-1">{label}</label>
                      <input type="number" value={salaryForm[field]} onChange={(e) => handleSalaryChange(field, e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" />
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-right">
                  <span className="text-sm text-slate-500">Total Earnings: </span>
                  <span className="text-lg font-bold text-emerald-600">{formatCurrency(calculateTotalEarnings(salaryForm))}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>Deductions
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    ['pf', 'PF'], ['esi', 'ESI'], ['professionalTax', 'Prof. Tax'],
                    ['tds', 'TDS'], ['loanDeduction', 'Loan'], ['otherDeductions', 'Other']
                  ].map(([field, label]) => (
                    <div key={field}>
                      <label className="block text-xs text-slate-500 mb-1">{label}</label>
                      <input type="number" value={salaryForm[field]} onChange={(e) => handleSalaryChange(field, e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" />
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-right">
                  <span className="text-sm text-slate-500">Total Deductions: </span>
                  <span className="text-lg font-bold text-red-600">{formatCurrency(calculateTotalDeductions(salaryForm))}</span>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="block text-xs text-slate-500 mb-1">Notes</label>
                <textarea value={salaryForm.notes} onChange={(e) => setSalaryForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm resize-none" placeholder="Any additional notes..." />
              </div>

              {/* Summary */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-600 dark:text-slate-400">Gross Salary</span>
                  <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(calculateTotalEarnings(salaryForm))}</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-600 dark:text-slate-400">Total Deductions</span>
                  <span className="font-medium text-red-600">- {formatCurrency(calculateTotalDeductions(salaryForm))}</span>
                </div>
                {salaryForm.lopDays > 0 && (
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600 dark:text-slate-400">LOP ({salaryForm.lopDays} days)</span>
                    <span className="font-medium text-red-600">- {formatCurrency(Math.round((salaryForm.basicSalary / salaryForm.workingDays) * salaryForm.lopDays))}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 dark:border-slate-600 mt-2 pt-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">Net Salary</span>
                  <span className="text-xl font-bold text-emerald-600">{formatCurrency(calculateNetSalary(salaryForm))}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 flex-shrink-0">
              <button onClick={() => setShowSalaryModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium">Cancel</button>
              <button onClick={saveSalary} className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedPage>
  )
}