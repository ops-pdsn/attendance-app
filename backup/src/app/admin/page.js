'use client'




import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DateRangeFilter from '@/components/DateRangeFilter'
import AdminCharts from '@/components/AdminCharts'
import DepartmentManager from '@/components/DepartmentManager'
import BulkActions from '@/components/BulkActions'
import { exportUsers } from '@/lib/exportCSV'

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasFetched, setHasFetched] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [dateFilter, setDateFilter] = useState({ start: null, end: null })
  const [showDepartmentManager, setShowDepartmentManager] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])

  const fetchData = useCallback(async () => {
    if (hasFetched) return
    
    try {
      setLoading(true)
      setHasFetched(true)
      
      // Build stats URL with date filter
      let statsUrl = '/api/admin/stats'
      if (dateFilter.start && dateFilter.end) {
        statsUrl += `?startDate=${dateFilter.start}&endDate=${dateFilter.end}`
      }
      
      const [usersRes, statsRes, deptsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch(statsUrl),
        fetch('/api/departments')
      ])
      
      if (!usersRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data')
      }
      
      const usersData = await usersRes.json()
      const statsData = await statsRes.json()
      const deptsData = deptsRes.ok ? await deptsRes.json() : []
      
      setUsers(usersData)
      setStats(statsData)
      setDepartments(deptsData)
      setSelectedUsers([]) // Clear selection on refresh
      setLoading(false)
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err.message)
      setLoading(false)
    }
  }, [hasFetched, dateFilter])

  useEffect(() => {
    if (status === 'loading') return
    
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    
    if (session?.user?.role !== 'admin' && session?.user?.role !== 'hr') {
      router.push('/')
      return
    }
    
    if (!hasFetched) {
      fetchData()
    }
  }, [status, session, router, hasFetched, fetchData])

  // Date filter handlers
  const handleDateFilter = (start, end) => {
    setDateFilter({ start, end })
    setHasFetched(false)
  }

  const handleDateReset = () => {
    setDateFilter({ start: null, end: null })
    setHasFetched(false)
  }

  // Selection handlers
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId)
      }
      return [...prev, userId]
    })
  }

  const handleSelectAll = () => {
    const selectableUsers = filteredUsers.filter(u => u.id !== session?.user?.id)
    if (selectedUsers.length === selectableUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(selectableUsers.map(u => u.id))
    }
  }

  const handleClearSelection = () => {
    setSelectedUsers([])
  }

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = !filterRole || user.role === filterRole
    
    return matchesSearch && matchesRole
  })

  // Get initials from name
  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??'
  }

  // Get avatar gradient based on name
  const getAvatarGradient = (name) => {
    const gradients = [
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-purple-500 to-pink-600',
      'from-cyan-500 to-blue-600',
      'from-amber-500 to-orange-600',
    ]
    const index = name?.charCodeAt(0) % gradients.length || 0
    return gradients[index]
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-xl bg-slate-900/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-sm text-slate-400">Welcome back, {session?.user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDepartmentManager(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105 shadow-lg shadow-purple-500/25"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="hidden sm:inline">Departments</span>
              </button>
              <DateRangeFilter 
                onFilter={handleDateFilter}
                onReset={handleDateReset}
              />
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-all duration-200 hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Back to App</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Date Filter Indicator */}
        {dateFilter.start && dateFilter.end && (
          <div className="mb-4 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between">
            <span className="text-sm text-blue-300">
              📅 Showing stats from {new Date(dateFilter.start).toLocaleDateString()} to {new Date(dateFilter.end).toLocaleDateString()}
            </span>
            <button
              onClick={handleDateReset}
              className="text-sm text-blue-400 hover:underline"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-400">{error}</p>
            </div>
            <button 
              onClick={() => { setHasFetched(false); setError(''); }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400">Loading dashboard data...</p>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && !error && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Users Card */}
              <div className="group relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 shadow-xl shadow-blue-500/20 overflow-hidden transition-transform duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-blue-100 text-sm font-medium">Total Users</span>
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-white">{stats?.users?.total || 0}</p>
                  <p className="text-blue-200 text-xs mt-1">Registered accounts</p>
                </div>
              </div>

              {/* Today Present Card */}
              <div className="group relative bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 shadow-xl shadow-emerald-500/20 overflow-hidden transition-transform duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-emerald-100 text-sm font-medium">Today Present</span>
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-white">{stats?.attendance?.today?.total || 0}</p>
                  <p className="text-emerald-200 text-xs mt-1">Checked in today</p>
                </div>
              </div>

              {/* Total Tasks Card */}
              <div className="group relative bg-gradient-to-br from-purple-600 to-pink-700 rounded-2xl p-5 shadow-xl shadow-purple-500/20 overflow-hidden transition-transform duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-purple-100 text-sm font-medium">Total Tasks</span>
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-white">{stats?.tasks?.total || 0}</p>
                  <p className="text-purple-200 text-xs mt-1">All time tasks</p>
                </div>
              </div>

              {/* Completion Rate Card */}
              <div className="group relative bg-gradient-to-br from-orange-600 to-red-700 rounded-2xl p-5 shadow-xl shadow-orange-500/20 overflow-hidden transition-transform duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-orange-100 text-sm font-medium">Completion Rate</span>
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-white">{stats?.tasks?.completionRate || 0}%</p>
                  <p className="text-orange-200 text-xs mt-1">Tasks completed</p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="mb-6">
              <AdminCharts stats={stats} users={users} />
            </div>

            {/* Employees Section */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
              {/* Section Header */}
              <div className="p-4 sm:p-6 border-b border-slate-700/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">All Employees</h2>
                    <p className="text-slate-400 text-sm">{filteredUsers.length} of {users.length} employees</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportUsers(filteredUsers)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105 shadow-lg shadow-emerald-500/25"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export CSV
                    </button>
                    <button
                      onClick={() => setHasFetched(false)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105 shadow-lg shadow-blue-500/25"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by name, email, or employee ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                  </div>

                  {/* Role Filter */}
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-4 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all min-w-[150px]"
                  >
                    <option value="">All Roles</option>
                    <option value="employee">Employee</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-900/50">
                      {/* Select All Checkbox */}
                      <th className="px-4 py-4 w-12">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length > 0 && selectedUsers.length === filteredUsers.filter(u => u.id !== session?.user?.id).length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                        />
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Employee</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Department</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="px-4 sm:px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Tasks</th>
                      <th className="px-4 sm:px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Attendance</th>
                      <th className="px-4 sm:px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredUsers.map((user, index) => (
                      <tr 
                        key={user.id} 
                        className={`hover:bg-slate-700/30 transition-colors ${
                          selectedUsers.includes(user.id) ? 'bg-blue-900/20' : ''
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Selection Checkbox */}
                        <td className="px-4 py-4 w-12">
                          {user.id !== session?.user?.id ? (
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => handleSelectUser(user.id)}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                            />
                          ) : (
                            <span className="text-slate-600 text-xs">You</span>
                          )}
                        </td>

                        {/* Employee Info */}
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarGradient(user.name)} rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg`}>
                              {getInitials(user.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">{user.name}</p>
                              <p className="text-sm text-slate-400 truncate">{user.email}</p>
                              {user.employeeId && (
                                <p className="text-xs text-slate-500 md:hidden">ID: {user.employeeId}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                          <span className="text-slate-300">{user.department || '-'}</span>
                        </td>

                        {/* Role */}
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            user.role === 'admin' 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : user.role === 'hr' 
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {user.role === 'admin' && (
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                          </span>
                        </td>

                        {/* Tasks */}
                        <td className="px-4 sm:px-6 py-4 text-center hidden sm:table-cell">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 rounded-lg">
                            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="text-slate-300 font-medium">{user._count?.tasks || 0}</span>
                          </div>
                        </td>

                        {/* Attendance */}
                        <td className="px-4 sm:px-6 py-4 text-center hidden sm:table-cell">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 rounded-lg">
                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-slate-300 font-medium">{user._count?.attendance || 0}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 sm:px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            user.isActive 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                              </svg>
                            </div>
                            <p className="text-slate-400 font-medium">No employees found</p>
                            <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filter</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-900/30">
                <p className="text-sm text-slate-500">
                  Showing {filteredUsers.length} of {users.length} employees
                  {selectedUsers.length > 0 && (
                    <span className="ml-2 text-blue-400">• {selectedUsers.length} selected</span>
                  )}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Bulk Actions */}
        <BulkActions
          selectedUsers={selectedUsers}
          onAction={() => setHasFetched(false)}
          onClearSelection={handleClearSelection}
          departments={departments}
        />

        {/* Department Manager Modal */}
        {showDepartmentManager && (
          <DepartmentManager
            onClose={() => setShowDepartmentManager(false)}
            onUpdate={() => setHasFetched(false)}
          />
        )}
      </main>
    </div>
  )
}