'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Calendar from '@/components/Calendar'
import DayDetails from '@/components/DayDetails'
import DarkModeToggle from '@/components/DarkModeToggle'
import AutoCarryForward from '@/components/AutoCarryForward'
import HolidayManager from '@/components/HolidayManager'
import UserNav from '@/components/UserNav'
import AttendanceCharts from '@/components/AttendanceCharts'
import OrgTree from '@/components/OrgTree'
import BackupRestore from '@/components/BackupRestore'
import { DashboardSkeleton } from '@/components/Skeleton'
import { exportAttendance, exportTasks } from '@/lib/exportCSV'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import NotificationBell from '@/components/NotificationBell'
import ReportGenerator from '@/components/ReportGenerator'
import AttendanceModal from '@/components/AttendanceModal'


export default function Home() {
  const [tasks, setTasks] = useState([])
  const [attendance, setAttendance] = useState([])
  const [holidays, setHolidays] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [showReportGenerator, setShowReportGenerator] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  
  // Modal states
  const [showHolidayManager, setShowHolidayManager] = useState(false)
  const [showOrgTree, setShowOrgTree] = useState(false)
  const [showBackupRestore, setShowBackupRestore] = useState(false)
  const [showCharts, setShowCharts] = useState(false)
  
  // Dropdown states
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [showMoreDropdown, setShowMoreDropdown] = useState(false)
  
  // Dropdown refs for positioning
  const filterButtonRef = useRef(null)
  const exportButtonRef = useRef(null)
  const moreButtonRef = useRef(null)
  
  // Dropdown positions
  const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 })
  const [exportPosition, setExportPosition] = useState({ top: 0, left: 0 })
  const [morePosition, setMorePosition] = useState({ top: 0, left: 0 })
  
  // Date filter state
  const [dateFilter, setDateFilter] = useState({ start: null, end: null })
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  
  // Portal mount state
  const [mounted, setMounted] = useState(false)
  
  const toast = useToast()
  const { confirm } = useConfirm()

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])

  // Calculate dropdown positions
  useEffect(() => {
    if (showFilterDropdown && filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect()
      setFilterPosition({ top: rect.bottom + 8, left: rect.left })
    }
  }, [showFilterDropdown])

  useEffect(() => {
    if (showExportDropdown && exportButtonRef.current) {
      const rect = exportButtonRef.current.getBoundingClientRect()
      setExportPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
  }, [showExportDropdown])

  useEffect(() => {
    if (showMoreDropdown && moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect()
      setMorePosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
  }, [showMoreDropdown])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showFilterDropdown && filterButtonRef.current && !filterButtonRef.current.contains(e.target)) {
        const dropdown = document.getElementById('filter-dropdown')
        if (dropdown && !dropdown.contains(e.target)) {
          setShowFilterDropdown(false)
        }
      }
      if (showExportDropdown && exportButtonRef.current && !exportButtonRef.current.contains(e.target)) {
        const dropdown = document.getElementById('export-dropdown')
        if (dropdown && !dropdown.contains(e.target)) {
          setShowExportDropdown(false)
        }
      }
      if (showMoreDropdown && moreButtonRef.current && !moreButtonRef.current.contains(e.target)) {
        const dropdown = document.getElementById('more-dropdown')
        if (dropdown && !dropdown.contains(e.target)) {
          setShowMoreDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilterDropdown, showExportDropdown, showMoreDropdown])
  
  const fetchData = async () => {
    try {
      const [tasksRes, attendanceRes, holidaysRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/attendance'),
        fetch('/api/holidays')
      ])
      
      if (!tasksRes.ok || !attendanceRes.ok || !holidaysRes.ok) {
        throw new Error('Failed to fetch data')
      }
      
      const tasksData = await tasksRes.json()
      const attendanceData = await attendanceRes.json()
      const holidaysData = await holidaysRes.json()
      
      setTasks(tasksData)
      setAttendance(attendanceData)
      setHolidays(holidaysData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data. Please refresh.')
      setLoading(false)
    }
  }

  // Quick date filter presets
  const applyQuickFilter = (preset) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let start, end

    switch (preset) {
      case 'today':
        start = end = today
        break
      case 'yesterday':
        start = end = new Date(today.getTime() - 86400000)
        break
      case 'last7':
        start = new Date(today.getTime() - 7 * 86400000)
        end = today
        break
      case 'last30':
        start = new Date(today.getTime() - 30 * 86400000)
        end = today
        break
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = today
        break
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        end = new Date(today.getFullYear(), today.getMonth(), 0)
        break
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1)
        end = today
        break
      default:
        return
    }

    setDateFilter({ start: start.toISOString(), end: end.toISOString() })
    setShowFilterDropdown(false)
    toast.info(`Filter applied: ${preset.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
  }

  const applyCustomFilter = () => {
    if (!customStart || !customEnd) {
      toast.warning('Please select both start and end dates')
      return
    }
    setDateFilter({ start: new Date(customStart).toISOString(), end: new Date(customEnd).toISOString() })
    setShowFilterDropdown(false)
    toast.success('Custom date filter applied')
  }

  const clearFilter = () => {
    setDateFilter({ start: null, end: null })
    setCustomStart('')
    setCustomEnd('')
    setShowFilterDropdown(false)
    toast.info('Filter cleared')
  }

  // Filter data by date range
  const filterByDate = (items, dateField = 'date') => {
    if (!dateFilter.start || !dateFilter.end) return items
    
    const start = new Date(dateFilter.start)
    start.setHours(0, 0, 0, 0)
    
    const end = new Date(dateFilter.end)
    end.setHours(23, 59, 59, 999)
    
    return items.filter(item => {
      const itemDate = new Date(item[dateField])
      return itemDate >= start && itemDate <= end
    })
  }
  
  // Get tasks for selected date
  const getSelectedDateTasks = () => {
    if (!selectedDate) return []
    const dateStr = selectedDate.toISOString().split('T')[0]
    return tasks.filter(t => t.date.split('T')[0] === dateStr)
  }
  
  // Get attendance for selected date
  const getSelectedDateAttendance = () => {
    if (!selectedDate) return []
    const dateStr = selectedDate.toISOString().split('T')[0]
    return attendance.filter(a => a.date.split('T')[0] === dateStr)
  }
  
  // Add new task
  const handleAddTask = async (taskData) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })
      
      if (res.ok) {
        toast.success('Task added successfully!')
        fetchData()
      } else {
        toast.error('Failed to add task')
      }
    } catch (error) {
      toast.error('Error adding task')
    }
  }
  
  // Toggle task completion
  const handleToggleTask = async (taskId, completed) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      })
      
      if (res.ok) {
        toast.success(completed ? 'Task completed! 🎉' : 'Task marked incomplete')
        fetchData()
      }
    } catch (error) {
      toast.error('Error updating task')
    }
  }
  
  // Mark attendance
  const handleMarkAttendance = async (attendanceData) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceData)
      })
      
      if (res.ok) {
        toast.success(`Attendance marked: ${attendanceData.status === 'office' ? '🏢 Office' : '🚗 Field'}`)
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to mark attendance')
      }
    } catch (error) {
      toast.error('Error marking attendance')
    }
  }
  
  // Delete task
  const handleDeleteTask = async (taskId) => {
    const confirmed = await confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Keep',
      type: 'danger'
    })
    
    if (!confirmed) return
    
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        toast.success('Task deleted')
        fetchData()
      }
    } catch (error) {
      toast.error('Error deleting task')
    }
  }
  
  // Carry forward incomplete tasks
  const handleCarryForward = async (fromDate) => {
    const confirmed = await confirm({
      title: 'Carry Forward Tasks',
      message: 'This will copy all incomplete tasks from this date to tomorrow. Continue?',
      confirmText: 'Carry Forward',
      cancelText: 'Cancel',
      type: 'info'
    })
    
    if (!confirmed) return
    
    try {
      const res = await fetch('/api/tasks/carry-forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromDate: fromDate.toISOString(),
          toDate: fromDate.toISOString()
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success(data.message)
        fetchData()
      }
    } catch (error) {
      toast.error('Error carrying forward tasks')
    }
  }

  // Handle exports
  const handleExportTasks = () => {
    exportTasks(filteredTasks)
    toast.success('Tasks exported to CSV')
    setShowExportDropdown(false)
  }

  const handleExportAttendance = () => {
    exportAttendance(filteredAttendance)
    toast.success('Attendance exported to CSV')
    setShowExportDropdown(false)
  }
  
  // Calculate stats (with date filter applied)
  const filteredTasks = filterByDate(tasks)
  const filteredAttendance = filterByDate(attendance)
  
  const stats = {
    totalTasks: filteredTasks.length,
    completedTasks: filteredTasks.filter(t => t.completed).length,
    attendanceDays: filteredAttendance.length,
    officeDays: filteredAttendance.filter(a => a.status === 'office').length,
    fieldDays: filteredAttendance.filter(a => a.status === 'field').length
  }

  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0

  const getFilterLabel = () => {
    if (!dateFilter.start || !dateFilter.end) return 'All Time'
    const start = new Date(dateFilter.start).toLocaleDateString()
    const end = new Date(dateFilter.end).toLocaleDateString()
    if (start === end) return start
    return `${start} - ${end}`
  }
  
  // Show skeleton while loading
  if (loading) {
    return <DashboardSkeleton />
  }

  // Filter Dropdown Component (Portal)
  const FilterDropdown = () => (
    <div 
      id="filter-dropdown"
      className="fixed bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-72 overflow-hidden"
      style={{
        top: filterPosition.top,
        left: Math.min(filterPosition.left, window.innerWidth - 300),
        zIndex: 99999,
        animation: 'dropdownIn 0.2s ease-out'
      }}
    >
      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Filter by Date</h3>
      </div>
      
      {/* Quick Filters */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-2 gap-1">
          {[
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'last7', label: 'Last 7 Days' },
            { key: 'last30', label: 'Last 30 Days' },
            { key: 'thisMonth', label: 'This Month' },
            { key: 'lastMonth', label: 'Last Month' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => applyQuickFilter(item.key)}
              className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Custom Range */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Custom Range</p>
        <div className="flex gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="flex-1 px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-slate-900 dark:text-white"
          />
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="flex-1 px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-slate-900 dark:text-white"
          />
        </div>
        <button
          onClick={applyCustomFilter}
          className="w-full px-3 py-2 text-xs font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Apply Custom Range
        </button>
      </div>
      
      {/* Clear Filter */}
      {(dateFilter.start || dateFilter.end) && (
        <div className="p-2 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={clearFilter}
            className="w-full px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
          >
            Clear Filter
          </button>
        </div>
      )}
    </div>
  )

  // Export Dropdown Component (Portal)
  const ExportDropdown = () => (
    <div 
      id="export-dropdown"
      className="fixed bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-56 overflow-hidden"
      style={{
        top: exportPosition.top,
        right: exportPosition.right,
        zIndex: 99999,
        animation: 'dropdownIn 0.2s ease-out'
      }}
    >
      <div className="p-2">
        <button
          onClick={handleExportTasks}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
            <span className="text-lg">📋</span>
          </div>
          <div className="text-left">
            <p className="font-medium">Export Tasks</p>
            <p className="text-xs text-slate-500">{filteredTasks.length} tasks</p>
          </div>
        </button>
        
        <button
          onClick={handleExportAttendance}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
            <span className="text-lg">📅</span>
          </div>
          <div className="text-left">
            <p className="font-medium">Export Attendance</p>
            <p className="text-xs text-slate-500">{filteredAttendance.length} records</p>
          </div>
        </button>
      </div>
    </div>
  )

  // More Menu Dropdown Component (Portal)
  const MoreDropdown = () => (
    <div 
      id="more-dropdown"
      className="fixed bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-64 overflow-hidden"
      style={{
        top: morePosition.top,
        right: morePosition.right,
        zIndex: 99999,
        animation: 'dropdownIn 0.2s ease-out'
      }}
    >
      <div className="p-2">
        <button
          onClick={() => { setShowOrgTree(true); setShowMoreDropdown(false) }}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-medium">Organization Tree</p>
            <p className="text-xs text-slate-500">View team hierarchy</p>
          </div>
        </button>
        <button
  onClick={() => { setShowReportGenerator(true); setShowMoreDropdown(false) }}
  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
>
  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center">
    <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  </div>
  <div className="text-left">
    <p className="font-medium">PDF Reports</p>
    <p className="text-xs text-slate-500 dark:text-slate-400">Generate & download</p>
  </div>
</button>
        
        <button
          onClick={() => { setShowBackupRestore(true); setShowMoreDropdown(false) }}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-medium">Backup & Restore</p>
            <p className="text-xs text-slate-500">Export or import data</p>
          </div>
        </button>

        <div className="my-2 border-t border-slate-200 dark:border-slate-700"></div>
        
        <button
          onClick={() => { setShowHolidayManager(true); setShowMoreDropdown(false) }}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center">
            <span className="text-lg">🎉</span>
          </div>
          <div className="text-left">
            <p className="font-medium">Manage Holidays</p>
            <p className="text-xs text-slate-500">{holidays.length} holidays</p>
          </div>
        </button>
        
        <button
          onClick={() => { setShowCharts(!showCharts); setShowMoreDropdown(false) }}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${showCharts ? 'bg-violet-500 text-white' : 'bg-violet-100 dark:bg-violet-500/20'}`}>
            <span className="text-lg">📊</span>
          </div>
          <div className="text-left">
            <p className="font-medium">{showCharts ? 'Hide Charts' : 'Show Charts'}</p>
            <p className="text-xs text-slate-500">Analytics & insights</p>
          </div>
        </button>
      </div>
    </div>
  )
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      {/* Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Logo & Title */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <img 
                    src="/availability.png" 
                    alt="Attendance" 
                    className="w-7 h-7 sm:w-8 sm:h-8 invert"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    Attendance
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
                    Track your tasks & attendance
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
                {/* Date Filter Button */}
                <button
                  ref={filterButtonRef}
                  onClick={() => {
                    setShowFilterDropdown(!showFilterDropdown)
                    setShowExportDropdown(false)
                    setShowMoreDropdown(false)
                  }}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                    dateFilter.start 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">{getFilterLabel()}</span>
                  <svg className={`w-4 h-4 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Export Button */}
                <button
                  ref={exportButtonRef}
                  onClick={() => {
                    setShowExportDropdown(!showExportDropdown)
                    setShowFilterDropdown(false)
                    setShowMoreDropdown(false)
                  }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 text-sm font-medium shadow-lg shadow-emerald-500/25"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline">Export</span>
                  <svg className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* More Button */}
                <button
                  ref={moreButtonRef}
                  onClick={() => {
                    setShowMoreDropdown(!showMoreDropdown)
                    setShowFilterDropdown(false)
                    setShowExportDropdown(false)
                  }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="hidden sm:inline">More</span>
                  <svg className={`w-4 h-4 transition-transform ${showMoreDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <DarkModeToggle />
                <NotificationBell />
                
                <div className="hidden sm:block w-px h-8 bg-slate-300 dark:bg-slate-600"></div>
                
                <UserNav />
              </div>
            </div>
          </div>
        </header>

        {/* Date Filter Indicator */}
        {dateFilter.start && dateFilter.end && (
          <div className="mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between animate-fadeIn">
            <span className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Showing: {new Date(dateFilter.start).toLocaleDateString()} - {new Date(dateFilter.end).toLocaleDateString()}
            </span>
            <button
              onClick={clearFilter}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Tasks */}
          <div className="group bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Tasks</span>
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.totalTasks}</p>
          </div>

          {/* Completed */}
          <div className="group bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Done</span>
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completedTasks}</p>
            <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Attendance Days */}
          <div className="group bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Days</span>
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.attendanceDays}</p>
          </div>

          {/* Office Days */}
          <div className="group bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Office</span>
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                🏢
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{stats.officeDays}</p>
          </div>

          {/* Field Days */}
          <div className="group bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Field</span>
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                🚗
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.fieldDays}</p>
          </div>
        </div>

        {/* Charts Section (Collapsible) */}
        {showCharts && (
          <div className="mb-6 animate-fadeIn">
            <AttendanceCharts attendance={attendance} tasks={tasks} />
          </div>
        )}
        
        {/* Main Content */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 order-1">
            {/* Calendar Section */}
<div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700/50 p-6 shadow-xl">
  {/* Calendar Header */}
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
      {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
    </h2>
    <div className="flex items-center gap-2">
      <button
        onClick={() => setCurrentMonth(new Date())}
        className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors"
      >
        Today
      </button>
      <button
        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
      >
        <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
      >
        <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>

  {/* Day Headers */}
  <div className="grid grid-cols-7 gap-1 mb-2">
    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
      <div key={day} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2">
        {day}
      </div>
    ))}
  </div>

  {/* Calendar Grid */}
  <div className="grid grid-cols-7 gap-1">
    {(() => {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const firstDay = new Date(year, month, 1).getDay()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const days = []
      
      // Empty cells for days before the first day of the month
      for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="aspect-square" />)
      }
      
      // Days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day)
        date.setHours(0, 0, 0, 0)
        const isToday = date.getTime() === today.getTime()
        const isPast = date < today
        const isFuture = date > today
        
        // Find attendance for this day
        const dayAttendance = attendance.find(a => {
          const aDate = new Date(a.date)
          aDate.setHours(0, 0, 0, 0)
          return aDate.getTime() === date.getTime()
        })
        
        // Determine status color
        let statusClass = ''
        let statusIcon = null
        
        if (dayAttendance) {
          if (dayAttendance.status === 'office') {
            statusClass = 'bg-blue-500 text-white'
            statusIcon = '🏢'
          } else if (dayAttendance.status === 'field') {
            statusClass = 'bg-emerald-500 text-white'
            statusIcon = '🚗'
          }
        }
        
        days.push(
          <button
            key={day}
            onClick={() => {
              if (!isFuture) {
                setSelectedDate(date)
                setShowAttendanceModal(true)
              }
            }}
            disabled={isFuture}
            className={`
              aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all relative
              ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' : ''}
              ${statusClass || (isFuture ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700')}
              ${!statusClass && !isFuture ? 'bg-slate-50 dark:bg-slate-700/50' : ''}
            `}
          >
            <span>{day}</span>
            {statusIcon && <span className="text-xs mt-0.5">{statusIcon}</span>}
            {dayAttendance?.location && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-yellow-400 rounded-full" title="Has location" />
            )}
          </button>
        )
      }
      
      return days
    })()}
  </div>

  {/* Legend */}
  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 text-xs">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 bg-blue-500 rounded"></div>
      <span className="text-slate-600 dark:text-slate-400">Office</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 bg-emerald-500 rounded"></div>
      <span className="text-slate-600 dark:text-slate-400">Field</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 bg-slate-200 dark:bg-slate-600 rounded ring-2 ring-blue-500"></div>
      <span className="text-slate-600 dark:text-slate-400">Today</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
      <span className="text-slate-600 dark:text-slate-400">Has Location</span>
    </div>
  </div>
</div>
          </div>
          
          <div className="order-2">
            <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl">
              <DayDetails
                date={selectedDate}
                tasks={getSelectedDateTasks()}
                attendance={getSelectedDateAttendance()}
                holidays={holidays}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
                onMarkAttendance={handleMarkAttendance}
                onDeleteTask={handleDeleteTask}
                onCarryForward={handleCarryForward}
              />
            </div>
          </div>
        </div>
        
        <AutoCarryForward onCarryForward={handleCarryForward} />
      </div>

      {/* Portal Dropdowns */}
      {mounted && showFilterDropdown && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 99998 }} onClick={() => setShowFilterDropdown(false)} />
          <FilterDropdown />
        </>,
        document.body
      )}

      {mounted && showExportDropdown && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 99998 }} onClick={() => setShowExportDropdown(false)} />
          <ExportDropdown />
        </>,
        document.body
      )}

      {mounted && showMoreDropdown && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 99998 }} onClick={() => setShowMoreDropdown(false)} />
          <MoreDropdown />
        </>,
        document.body
      )}

      {/* Modals */}
      {showHolidayManager && (
        <HolidayManager
          onClose={() => setShowHolidayManager(false)}
          onImported={fetchData}
        />
      )}

      {showOrgTree && (
        <OrgTree onClose={() => setShowOrgTree(false)} />
      )}

      {showBackupRestore && (
        <BackupRestore onClose={() => setShowBackupRestore(false)} />
      )}

      {showReportGenerator && (
        <ReportGenerator onClose={() => setShowReportGenerator(false)} />
      )}

      {showAttendanceModal && selectedDate && (
        <AttendanceModal
          date={selectedDate}
          existingAttendance={attendance.find(a => 
            new Date(a.date).toDateString() === selectedDate.toDateString()
          )}
          onClose={() => {
            setShowAttendanceModal(false)
          }}
          onSuccess={fetchData}
        />
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}