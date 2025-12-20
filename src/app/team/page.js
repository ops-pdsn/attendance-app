'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'
import NotificationBell from '@/components/NotificationBell'
import { useToast } from '@/components/Toast'

export const dynamic = 'force-dynamic'

export default function TeamDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState([])
  const [todayAttendance, setTodayAttendance] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState('grid') // grid or list
  const [filterStatus, setFilterStatus] = useState('all') // all, present, absent

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (!['admin', 'hr', 'manager'].includes(session.user.role)) {
        toast.error('Access denied. Manager+ role required.')
        router.push('/')
        return
      }
      fetchData()
    }
  }, [status, router, session])

  const fetchData = async () => {
    try {
      const [usersRes, attendanceRes] = await Promise.all([
        fetch('/api/users?team=true'),
        fetch(`/api/attendance?date=${selectedDate}&team=true`)
      ])

      if (usersRes.ok) {
        const users = await usersRes.json()
        setTeamMembers(users)
      }
      if (attendanceRes.ok) {
        const attendance = await attendanceRes.json()
        setTodayAttendance(attendance)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData()
    }
  }, [selectedDate])

  const getAttendanceStatus = (userId) => {
    const record = todayAttendance.find(a => a.userId === userId)
    return record || null
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'office': return 'bg-blue-500'
      case 'field': return 'bg-emerald-500'
      case 'leave': return 'bg-amber-500'
      default: return 'bg-slate-300 dark:bg-slate-600'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'office': return '🏢 Office'
      case 'field': return '🚗 Field'
      case 'leave': return '🏖️ Leave'
      default: return '❌ Absent'
    }
  }

  const stats = {
    total: teamMembers.length,
    present: todayAttendance.filter(a => a.status === 'office' || a.status === 'field').length,
    office: todayAttendance.filter(a => a.status === 'office').length,
    field: todayAttendance.filter(a => a.status === 'field').length,
    absent: teamMembers.length - todayAttendance.filter(a => a.status === 'office' || a.status === 'field').length
  }

  const filteredMembers = teamMembers.filter(member => {
    if (filterStatus === 'all') return true
    const attendance = getAttendanceStatus(member.id)
    if (filterStatus === 'present') return attendance && (attendance.status === 'office' || attendance.status === 'field')
    if (filterStatus === 'absent') return !attendance || (attendance.status !== 'office' && attendance.status !== 'field')
    return true
  })

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl"></div>
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
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl sm:text-2xl">👥</span>
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Team Dashboard</h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Monitor team attendance</p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-indigo-500"
                />
                <DarkModeToggle />
                <NotificationBell />
                <UserNav />
              </div>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs text-slate-500">Total</span>
              <span className="text-lg">👥</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs text-slate-500">Present</span>
              <span className="text-lg">✅</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.present}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs text-slate-500">Office</span>
              <span className="text-lg">🏢</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.office}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs text-slate-500">Field</span>
              <span className="text-lg">🚗</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.field}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs text-slate-500">Absent</span>
              <span className="text-lg">❌</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{stats.absent}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
          {/* Status Filter */}
          <div className="flex gap-1 sm:gap-2 p-1 bg-white/50 dark:bg-slate-800/50 rounded-xl backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 overflow-x-auto">
            {[
              { key: 'all', label: 'All' },
              { key: 'present', label: 'Present' },
              { key: 'absent', label: 'Absent' }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setFilterStatus(filter.key)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  filterStatus === filter.key
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-1 p-1 bg-white/50 dark:bg-slate-800/50 rounded-xl backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-md' : ''}`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-md' : ''}`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Team Members */}
        {filteredMembers.length === 0 ? (
          <div className="text-center py-8 sm:py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <span className="text-2xl sm:text-3xl">👥</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium text-sm sm:text-base">No team members found</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredMembers.map(member => {
              const attendance = getAttendanceStatus(member.id)
              return (
                <div
                  key={member.id}
                  className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                        {member.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white dark:border-slate-800 ${getStatusColor(attendance?.status)}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base truncate">{member.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{member.department || 'No dept'}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Status</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        attendance?.status === 'office' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        attendance?.status === 'field' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {getStatusText(attendance?.status)}
                      </span>
                    </div>
                    {attendance?.punchIn && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-500">Punch In</span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {new Date(attendance.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    {attendance?.location && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span className="truncate">{attendance.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employee</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredMembers.map(member => {
                    const attendance = getAttendanceStatus(member.id)
                    return (
                      <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                              {member.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{member.name}</p>
                              <p className="text-xs text-slate-500 truncate">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.department || '-'}</td>
                        <td className="px-3 sm:px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            attendance?.status === 'office' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            attendance?.status === 'field' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {getStatusText(attendance?.status)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {attendance?.punchIn ? new Date(attendance.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}