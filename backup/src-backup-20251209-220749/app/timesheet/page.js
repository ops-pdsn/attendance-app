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

export default function TimeSheetPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState([])
  const [viewMode, setViewMode] = useState('week') // week, month
  const [currentDate, setCurrentDate] = useState(new Date())
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({ punchIn: '', punchOut: '' })

  // Standard work hours
  const STANDARD_HOURS_PER_DAY = 8
  const STANDARD_HOURS_PER_WEEK = 40

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchTimeSheetData()
    }
  }, [status, router, currentDate, viewMode])

  const fetchTimeSheetData = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRange()
      
      const res = await fetch(
        '/api/attendance?start=' + start.toISOString().split('T')[0] + '&end=' + end.toISOString().split('T')[0]
      )
      
      if (res.ok) {
        const data = await res.json()
        setAttendance(data)
      }
    } catch (error) {
      console.error('Error fetching timesheet:', error)
      toast.error('Failed to load timesheet data')
    } finally {
      setLoading(false)
    }
  }

  const getDateRange = () => {
    const date = new Date(currentDate)
    let start, end

    if (viewMode === 'week') {
      const dayOfWeek = date.getDay()
      start = new Date(date)
      start.setDate(date.getDate() - dayOfWeek)
      end = new Date(start)
      end.setDate(start.getDate() + 6)
    } else {
      start = new Date(date.getFullYear(), date.getMonth(), 1)
      end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    }

    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    return { start, end }
  }

  const getDaysInRange = () => {
    const { start, end } = getDateRange()
    const days = []
    const current = new Date(start)

    while (current <= end) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const getAttendanceForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return attendance.find(a => a.date.split('T')[0] === dateStr)
  }

  const calculateHours = (punchIn, punchOut) => {
    if (!punchIn || !punchOut) return 0
    const start = new Date(punchIn)
    const end = new Date(punchOut)
    const diffMs = end - start
    const hours = diffMs / (1000 * 60 * 60)
    return Math.max(0, hours)
  }

  const formatHours = (hours) => {
    if (!hours || hours === 0) return '-'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (m === 0) return h + 'h'
    return h + 'h ' + m + 'm'
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const calculateStats = () => {
    const days = getDaysInRange()
    let totalHours = 0
    let workingDays = 0
    let presentDays = 0

    days.forEach(day => {
      const dayOfWeek = day.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      
      if (!isWeekend) {
        workingDays++
        const record = getAttendanceForDate(day)
        if (record) {
          presentDays++
          const hours = calculateHours(record.punchIn, record.punchOut)
          totalHours += hours
        }
      }
    })

    const expectedHours = workingDays * STANDARD_HOURS_PER_DAY
    const overtime = Math.max(0, totalHours - expectedHours)
    const deficit = Math.max(0, expectedHours - totalHours)
    const avgHours = presentDays > 0 ? totalHours / presentDays : 0

    return {
      totalHours,
      expectedHours,
      overtime,
      deficit,
      avgHours,
      workingDays,
      presentDays,
      absentDays: workingDays - presentDays
    }
  }

  const handlePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleEditTime = async (id) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          punchIn: editData.punchIn ? new Date(editData.punchIn).toISOString() : undefined,
          punchOut: editData.punchOut ? new Date(editData.punchOut).toISOString() : undefined
        })
      })

      if (res.ok) {
        toast.success('Time updated successfully')
        setEditingId(null)
        fetchTimeSheetData()
      } else {
        toast.error('Failed to update time')
      }
    } catch (error) {
      toast.error('Error updating time')
    }
  }

  const startEdit = (record) => {
    setEditingId(record.id)
    setEditData({
      punchIn: record.punchIn ? new Date(record.punchIn).toISOString().slice(0, 16) : '',
      punchOut: record.punchOut ? new Date(record.punchOut).toISOString().slice(0, 16) : ''
    })
  }

  const getDateRangeLabel = () => {
    const { start, end } = getDateRange()
    const options = { month: 'short', day: 'numeric' }
    
    if (viewMode === 'week') {
      return start.toLocaleDateString('en-US', options) + ' - ' + end.toLocaleDateString('en-US', { ...options, year: 'numeric' })
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
  }

  const stats = calculateStats()

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading timesheet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <header className="mb-8">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">⏱️</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Time Sheet</h1>
                  <p className="text-slate-500 dark:text-slate-400">Track your work hours</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <DarkModeToggle />
                <NotificationBell />
                <UserNav />
              </div>
            </div>
          </div>
        </header>

        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* View Mode Toggle */}
          <div className="inline-flex gap-1 p-1 bg-white/50 dark:bg-slate-800/50 rounded-xl backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
            <button
              onClick={() => setViewMode('week')}
              className={'px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (
                viewMode === 'week'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={'px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              Monthly
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleToday}
              className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-xl hover:bg-indigo-600 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="ml-2 text-lg font-semibold text-slate-900 dark:text-white">
              {getDateRangeLabel()}
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Hours</span>
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <span className="text-lg">⏱️</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatHours(stats.totalHours)}</p>
            <p className="text-xs text-slate-500 mt-1">of {formatHours(stats.expectedHours)} expected</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Overtime</span>
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <span className="text-lg">📈</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatHours(stats.overtime)}</p>
            <p className="text-xs text-slate-500 mt-1">extra hours worked</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Deficit</span>
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <span className="text-lg">📉</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatHours(stats.deficit)}</p>
            <p className="text-xs text-slate-500 mt-1">hours remaining</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Daily</span>
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <span className="text-lg">📊</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatHours(stats.avgHours)}</p>
            <p className="text-xs text-slate-500 mt-1">{stats.presentDays} of {stats.workingDays} days</p>
          </div>
        </div>

        {/* Time Sheet Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Day</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Punch In</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Punch Out</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {getDaysInRange().map((day, index) => {
                  const record = getAttendanceForDate(day)
                  const hours = record ? calculateHours(record.punchIn, record.punchOut) : 0
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  const isToday = day.toDateString() === new Date().toDateString()
                  const isEditing = editingId === record?.id

                  return (
                    <tr 
                      key={index}
                      className={
                        (isWeekend ? 'bg-slate-50 dark:bg-slate-800/50 ' : '') +
                        (isToday ? 'bg-indigo-50 dark:bg-indigo-900/20 ' : '') +
                        'hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors'
                      }
                    >
                      <td className="px-4 py-3">
                        <span className={'text-sm font-medium ' + (isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white')}>
                          {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={'text-sm ' + (isWeekend ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400')}>
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isWeekend ? (
                          <span className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-lg">
                            Weekend
                          </span>
                        ) : record ? (
                          <span className={'px-2 py-1 text-xs font-medium rounded-lg ' + (
                            record.status === 'office'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          )}>
                            {record.status === 'office' ? '🏢 Office' : '🚗 Field'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                            Absent
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            value={editData.punchIn}
                            onChange={(e) => setEditData({ ...editData, punchIn: e.target.value })}
                            className="px-2 py-1 text-sm bg-slate-100 dark:bg-slate-700 border-0 rounded-lg"
                          />
                        ) : (
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {formatTime(record?.punchIn)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            value={editData.punchOut}
                            onChange={(e) => setEditData({ ...editData, punchOut: e.target.value })}
                            className="px-2 py-1 text-sm bg-slate-100 dark:bg-slate-700 border-0 rounded-lg"
                          />
                        ) : (
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {formatTime(record?.punchOut)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={'text-sm font-medium ' + (
                          hours >= STANDARD_HOURS_PER_DAY
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : hours > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-400'
                        )}>
                          {formatHours(hours)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {record && !isWeekend && (
                          isEditing ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditTime(record.id)}
                                className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(record)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div className="px-4 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Present: </span>
                  <span className="font-semibold text-slate-900 dark:text-white">{stats.presentDays} days</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Absent: </span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{stats.absentDays} days</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={'px-3 py-1.5 rounded-lg text-sm font-medium ' + (
                  stats.overtime > 0
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : stats.deficit > 0
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                )}>
                  {stats.overtime > 0
                    ? '+' + formatHours(stats.overtime) + ' overtime'
                    : stats.deficit > 0
                      ? '-' + formatHours(stats.deficit) + ' deficit'
                      : 'On track'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}