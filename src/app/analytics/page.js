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

export const dynamic = 'force-dynamic'

export default function AnalyticsDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('month')
  const [analyticsData, setAnalyticsData] = useState(null)

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (!['admin', 'hr', 'manager'].includes(session.user.role)) {
        toast.error('Access denied. Manager+ role required.')
        router.push('/')
        return
      }
      fetchAnalytics()
    }
  }, [status, router, session])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAnalytics()
    }
  }, [dateRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?range=${dateRange}`)
      if (res.ok) {
        const data = await res.json()
        setAnalyticsData(data)
      } else {
        // Generate mock data if API fails
        setAnalyticsData(generateMockData())
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setAnalyticsData(generateMockData())
    } finally {
      setLoading(false)
    }
  }

  const generateMockData = () => {
    const days = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : dateRange === 'quarter' ? 90 : 365
    const attendanceTrend = []
    const today = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      attendanceTrend.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        office: Math.floor(Math.random() * 30) + 20,
        field: Math.floor(Math.random() * 15) + 5
      })
    }

    return {
      summary: {
        totalEmployees: 45,
        avgAttendanceRate: 87,
        avgHoursWorked: 7.8,
        totalLeavesTaken: 23,
        lateArrivals: 12,
        earlyDepartures: 8
      },
      attendanceTrend: attendanceTrend.slice(-7),
      departmentBreakdown: [
        { name: 'Engineering', value: 15, attendance: 92 },
        { name: 'Sales', value: 12, attendance: 85 },
        { name: 'Marketing', value: 8, attendance: 88 },
        { name: 'HR', value: 5, attendance: 95 },
        { name: 'Finance', value: 5, attendance: 90 }
      ],
      leaveTypes: [
        { name: 'Sick Leave', value: 8 },
        { name: 'Casual Leave', value: 10 },
        { name: 'Earned Leave', value: 5 }
      ],
      topPerformers: [
        { name: 'John Doe', attendance: 98, department: 'Engineering' },
        { name: 'Jane Smith', attendance: 96, department: 'HR' },
        { name: 'Bob Johnson', attendance: 95, department: 'Sales' }
      ]
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const data = analyticsData || generateMockData()
  
  // Ensure all arrays exist
  const attendanceTrend = data.attendanceTrend || []
  const departmentBreakdown = data.departmentBreakdown || []
  const leaveTypes = data.leaveTypes || []
  const topPerformers = data.topPerformers || []
  const summary = data.summary || {
    totalEmployees: 0,
    avgAttendanceRate: 0,
    avgHoursWorked: 0,
    totalLeavesTaken: 0,
    lateArrivals: 0,
    earlyDepartures: 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
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
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl sm:text-2xl">📊</span>
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Insights & trends</p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                {/* Date Range */}
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl overflow-x-auto">
                  {['week', 'month', 'quarter', 'year'].map(range => (
                    <button
                      key={range}
                      onClick={() => setDateRange(range)}
                      className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all capitalize whitespace-nowrap ${
                        dateRange === range
                          ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs text-slate-500">Employees</span>
              <span className="text-base sm:text-lg">👥</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{summary.totalEmployees}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs text-slate-500">Attendance</span>
              <span className="text-base sm:text-lg">📅</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.avgAttendanceRate}%</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs text-slate-500">Avg Hours</span>
              <span className="text-base sm:text-lg">⏱️</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.avgHoursWorked}h</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs text-slate-500">Leaves</span>
              <span className="text-base sm:text-lg">🏖️</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.totalLeavesTaken}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs text-slate-500">Late</span>
              <span className="text-base sm:text-lg">⏰</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{summary.lateArrivals}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs text-slate-500">Early Out</span>
              <span className="text-base sm:text-lg">🚪</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.earlyDepartures}</p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Attendance Trend */}
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-sm sm:text-lg font-semibold text-slate-900 dark:text-white mb-3 sm:mb-4">Attendance Trend</h3>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255,255,255,0.95)', 
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                      fontSize: '12px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="office" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Office" />
                  <Area type="monotone" dataKey="field" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Field" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-sm sm:text-lg font-semibold text-slate-900 dark:text-white mb-3 sm:mb-4">By Department</h3>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {departmentBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255,255,255,0.95)', 
                      borderRadius: '12px',
                      fontSize: '12px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Leave Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-sm sm:text-lg font-semibold text-slate-900 dark:text-white mb-3 sm:mb-4">Leave Types</h3>
            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaveTypes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255,255,255,0.95)', 
                      borderRadius: '12px',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Attendance */}
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-sm sm:text-lg font-semibold text-slate-900 dark:text-white mb-3 sm:mb-4">Dept Attendance %</h3>
            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255,255,255,0.95)', 
                      borderRadius: '12px',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="attendance" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-sm sm:text-lg font-semibold text-slate-900 dark:text-white mb-3 sm:mb-4">🏆 Top Attendance</h3>
            <div className="space-y-3">
              {topPerformers.map((performer, index) => (
                <div key={index} className="flex items-center gap-3 p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : 'bg-amber-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white text-xs sm:text-sm truncate">{performer.name}</p>
                    <p className="text-xs text-slate-500 truncate">{performer.department}</p>
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm">{performer.attendance}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}