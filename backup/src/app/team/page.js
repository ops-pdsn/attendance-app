'use client'




import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'
import NotificationBell from '@/components/NotificationBell'
import { useToast } from '@/components/Toast'

export default function TeamDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState([])
  const [todayAttendance, setTodayAttendance] = useState([])
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState('grid') // grid, list

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      // Only managers, hr, and admins can access
      if (!['admin', 'hr', 'manager'].includes(session?.user?.role)) {
        router.push('/')
        toast.error('Access denied. Manager privileges required.')
      } else {
        fetchTeamData()
      }
    }
  }, [status, session, router])

  const fetchTeamData = async () => {
    try {
      setLoading(true)
      
      const [usersRes, attendanceRes, leavesRes] = await Promise.all([
        fetch('/api/users?team=true'),
        fetch('/api/attendance/team?date=' + selectedDate),
        fetch('/api/leave-requests?pending=true&team=true')
      ])

      if (usersRes.ok) {
        const users = await usersRes.json()
        setTeamMembers(users)
      }

      if (attendanceRes.ok) {
        const attendance = await attendanceRes.json()
        setTodayAttendance(attendance)
      }

      if (leavesRes.ok) {
        const leaves = await leavesRes.json()
        setPendingLeaves(leaves)
      }
    } catch (error) {
      console.error('Error fetching team data:', error)
      toast.error('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && ['admin', 'hr', 'manager'].includes(session?.user?.role)) {
      fetchTeamData()
    }
  }, [selectedDate])

  const getAttendanceStatus = (userId) => {
    const record = todayAttendance.find(a => a.userId === userId)
    if (!record) return null
    return record
  }

  const getMemberStats = () => {
    const present = todayAttendance.length
    const absent = teamMembers.length - present
    const onLeave = pendingLeaves.filter(l => {
      const today = new Date(selectedDate)
      const start = new Date(l.startDate)
      const end = new Date(l.endDate)
      return l.status === 'approved' && today >= start && today <= end
    }).length
    const office = todayAttendance.filter(a => a.status === 'office').length
    const field = todayAttendance.filter(a => a.status === 'field').length

    return { present, absent, onLeave, office, field, total: teamMembers.length }
  }

  const stats = getMemberStats()

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading team dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-3xl"></div>
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
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">👥</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Team Dashboard</h1>
                  <p className="text-slate-500 dark:text-slate-400">Monitor your team&apos;s attendance</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white"
                />
                <DarkModeToggle />
                <NotificationBell />
                <UserNav />
              </div>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
            <div className="text-xs text-slate-500">Total Members</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.present}</div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400">Present</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-800">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.absent}</div>
            <div className="text-xs text-red-600 dark:text-red-400">Absent</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.office}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">🏢 Office</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.field}</div>
            <div className="text-xs text-amber-600 dark:text-amber-400">🚗 Field</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 border border-purple-200 dark:border-purple-800">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.onLeave}</div>
            <div className="text-xs text-purple-600 dark:text-purple-400">On Leave</div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Team Members</h2>
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={'px-3 py-1.5 rounded-lg text-sm font-medium transition-all ' + (
                viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''
              )}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={'px-3 py-1.5 rounded-lg text-sm font-medium transition-all ' + (
                viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''
              )}
            >
              List
            </button>
          </div>
        </div>

        {/* Team Members Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {teamMembers.map(member => {
              const attendance = getAttendanceStatus(member.id)
              return (
                <div
                  key={member.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                      {member.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{member.name}</h3>
                      <p className="text-xs text-slate-500 truncate">{member.department || 'No Department'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {attendance ? (
                      <span className={'px-2 py-1 text-xs font-medium rounded-lg ' + (
                        attendance.status === 'office'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      )}>
                        {attendance.status === 'office' ? '🏢 Office' : '🚗 Field'}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                        Absent
                      </span>
                    )}
                    
                    {attendance?.punchIn && (
                      <span className="text-xs text-slate-500">
                        {new Date(attendance.punchIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {attendance?.location && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                        <span>📍</span> {attendance.location}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Punch In</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Punch Out</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {teamMembers.map(member => {
                  const attendance = getAttendanceStatus(member.id)
                  return (
                    <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                            {member.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{member.department || '-'}</td>
                      <td className="px-4 py-3">
                        {attendance ? (
                          <span className={'px-2 py-1 text-xs font-medium rounded-lg ' + (
                            attendance.status === 'office'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          )}>
                            {attendance.status === 'office' ? '🏢 Office' : '🚗 Field'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                            Absent
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {attendance?.punchIn ? new Date(attendance.punchIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {attendance?.punchOut ? new Date(attendance.punchOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate">
                        {attendance?.location || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pending Leave Requests */}
        {pendingLeaves.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Pending Leave Requests ({pendingLeaves.length})
            </h2>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {pendingLeaves.slice(0, 5).map(leave => (
                  <div key={leave.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                        <span className="text-lg">🏖️</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{leave.user?.name}</p>
                        <p className="text-sm text-slate-500">
                          {leave.leaveType?.name} • {leave.days} day(s)
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/leave"
                      className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}