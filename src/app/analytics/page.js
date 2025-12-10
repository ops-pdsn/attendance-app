'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'
import NotificationBell from '@/components/NotificationBell'
import { useToast } from '@/components/Toast'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'

export default function AnalyticsDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('month') // week, month, quarter, year
  const [analyticsData, setAnalyticsData] = useState(null)

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (!['admin', 'hr', 'manager'].includes(session?.user?.role)) {
        router.push('/')
        toast.error('Access denied. Manager privileges required.')
      } else {
        fetchAnalytics()
      }
    }
  }, [status, session, router, dateRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/analytics?range=' + dateRange)
      if (res.ok) {
        const data = await res.json()
        setAnalyticsData(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  // Default data if API not ready
  const data = analyticsData || {
    summary: {
      totalEmployees: 25,
      avgAttendanceRate: 92,
      avgWorkHours: 7.8,
      totalLeavesTaken: 45,
      tasksCompleted: 320,
      taskCompletionRate: 85
    },
    attendanceTrend: [
      { date: 'Mon', present: 22, absent: 3, onLeave: 0 },
      { date: 'Tue', present: 24, absent: 1, onLeave: 0 },
      { date: 'Wed', present: 23, absent: 1, onLeave: 1 },
      { date: 'Thu', present: 21, absent: 2, onLeave: 2 },
      { date: 'Fri', present: 20, absent: 3, onLeave: 2 },
    ],
    departmentAttendance: [
      { name: 'Engineering', value: 95 },
      { name: 'Sales', value: 88 },
      { name: 'Marketing', value: 92 },
      { name: 'HR', value: 100 },
      { name: 'Finance', value: 90 },
    ],
    workHoursTrend: [
      { date: 'Week 1', hours: 38.5 },
      { date: 'Week 2', hours: 41.2 },
      { date: 'Week 3', hours: 39.8 },
      { date: 'Week 4', hours: 40.5 },
    ],
    leaveDistribution: [
      { name: 'Casual', value: 35 },
      { name: 'Sick', value: 25 },
      { name: 'Earned', value: 20 },
      { name: 'Unpaid', value: 10 },
      { name: 'Other', value: 10 },
    ],
    topPerformers: [
      { name: 'John Doe', attendance: 100, tasks: 45 },
      { name: 'Jane Smith', attendance: 98, tasks: 42 },
      { name: 'Bob Wilson', attendance: 96, tasks: 38 },
      { name: 'Alice Brown', attendance: 95, tasks: 35 },
      { name: 'Charlie Davis', attendance: 94, tasks: 33 },
    ],
    lateArrivals: [
      { date: 'Mon', count: 3 },
      { date: 'Tue', count: 2 },
      { date: 'Wed', count: 5 },
      { date: 'Thu', count: 4 },
      { date: 'Fri', count: 6 },
    ],
    overtimeHours: [
      { name: 'Engineering', hours: 45 },
      { name: 'Sales', hours: 32 },
      { name: 'Marketing', hours: 18 },
      { name: 'HR', hours: 8 },
      { name: 'Finance', hours: 22 },
    ]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-400/20 dark:bg-violet-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-pink-400/20 dark:bg-pink-500/10 rounded-full blur-3xl"></div>
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
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Analytics</h1>
                  <p className="text-slate-500 dark:text-slate-400">Insights & trends</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Date Range Selector */}
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
                  {['week', 'month', 'quarter', 'year'].map(range => (
                    <button
                      key={range}
                      onClick={() => setDateRange(range)}
                      className={'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ' + (
                        dateRange === range
                          ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      )}
                    >
                      {range}
                    </button>
                  ))}
                </div>
                <DarkModeToggle />
                <NotificationBell />
                <UserNav />
              </div>
            </div>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Employees</span>
              <span className="text-lg">👥</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.summary.totalEmployees}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Attendance</span>
              <span className="text-lg">📅</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.summary.avgAttendanceRate}%</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Avg Hours</span>
              <span className="text-lg">⏱️</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.summary.avgWorkHours}h</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Leaves</span>
              <span className="text-lg">🏖️</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.summary.totalLeavesTaken}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Tasks Done</span>
              <span className="text-lg">✅</span>
            </div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.summary.tasksCompleted}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Completion</span>
              <span className="text-lg">🎯</span>
            </div>
            <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{data.summary.taskCompletionRate}%</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Attendance Trend */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Legend />
                <Area type="monotone" dataKey="present" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Present" />
                <Area type="monotone" dataKey="absent" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Absent" />
                <Area type="monotone" dataKey="onLeave" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="On Leave" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Department Attendance */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Department Attendance Rate</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.departmentAttendance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [value + '%', 'Attendance']}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Work Hours Trend */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Weekly Work Hours</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.workHoursTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[30, 50]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [value + 'h', 'Hours']}
                />
                <Line type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 6 }} />
                {/* Reference line for 40 hours */}
                <Line type="monotone" dataKey={() => 40} stroke="#94a3b8" strokeDasharray="5 5" dot={false} name="Target (40h)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Leave Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Leave Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.leaveDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => name + ' ' + (percent * 100).toFixed(0) + '%'}
                >
                  {data.leaveDistribution.map((entry, index) => (
                    <Cell key={'cell-' + index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Performers */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">🏆 Top Performers</h3>
            <div className="space-y-3">
              {data.topPerformers.map((person, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={'w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ' + (
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-slate-400' :
                      index === 2 ? 'bg-amber-600' :
                      'bg-slate-300'
                    )}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white">{person.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{person.attendance}%</p>
                    <p className="text-xs text-slate-500">{person.tasks} tasks</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Late Arrivals */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">⏰ Late Arrivals</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.lateArrivals}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Overtime by Department */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">📈 Overtime Hours</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.overtimeHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [value + 'h', 'Overtime']}
                />
                <Bar dataKey="hours" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}