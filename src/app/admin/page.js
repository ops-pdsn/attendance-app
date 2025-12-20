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

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()
  const { confirm } = useConfirm()

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [stats, setStats] = useState({})
  const [showUserModal, setShowUserModal] = useState(false)
  const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editingLeaveType, setEditingLeaveType] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // User form state
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'employee',
    department: '',
    employeeId: '',
    phone: ''
  })

  // Leave type form state
  const [leaveTypeForm, setLeaveTypeForm] = useState({
    name: '',
    code: '',
    color: '#3b82f6',
    defaultDays: 12,
    isPaid: true,
    carryForward: false
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (!['admin', 'hr'].includes(session.user.role)) {
        toast.error('Access denied. Admin/HR role required.')
        router.push('/')
        return
      }
      fetchData()
    }
  }, [status, router, session])

  const fetchData = async () => {
    try {
      const [usersRes, leaveTypesRes, statsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/leave/types'),
        fetch('/api/admin/stats')
      ])

      if (usersRes.ok) setUsers(await usersRes.json())
      if (leaveTypesRes.ok) setLeaveTypes(await leaveTypesRes.json())
      if (statsRes.ok) {
        setStats(await statsRes.json())
      } else {
        // Mock stats if API doesn't exist
        setStats({
          totalUsers: 0,
          activeToday: 0,
          pendingLeaves: 0,
          totalLeaveTypes: 0
        })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveUser = async (e) => {
    e.preventDefault()
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      })

      if (res.ok) {
        toast.success(editingUser ? 'User updated!' : 'User created!')
        setShowUserModal(false)
        resetUserForm()
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save user')
      }
    } catch (error) {
      toast.error('Error saving user')
    }
  }

  const handleDeleteUser = async (userId) => {
    const confirmed = await confirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('User deleted')
        fetchData()
      } else {
        toast.error('Failed to delete user')
      }
    } catch (error) {
      toast.error('Error deleting user')
    }
  }

  const handleSaveLeaveType = async (e) => {
    e.preventDefault()
    try {
      const url = editingLeaveType ? `/api/leave/types/${editingLeaveType.id}` : '/api/leave/types'
      const method = editingLeaveType ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveTypeForm)
      })

      if (res.ok) {
        toast.success(editingLeaveType ? 'Leave type updated!' : 'Leave type created!')
        setShowLeaveTypeModal(false)
        resetLeaveTypeForm()
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save leave type')
      }
    } catch (error) {
      toast.error('Error saving leave type')
    }
  }

  const resetUserForm = () => {
    setUserForm({
      name: '',
      email: '',
      role: 'employee',
      department: '',
      employeeId: '',
      phone: ''
    })
    setEditingUser(null)
  }

  const resetLeaveTypeForm = () => {
    setLeaveTypeForm({
      name: '',
      code: '',
      color: '#3b82f6',
      defaultDays: 12,
      isPaid: true,
      carryForward: false
    })
    setEditingLeaveType(null)
  }

  const openEditUser = (user) => {
    setUserForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'employee',
      department: user.department || '',
      employeeId: user.employeeId || '',
      phone: user.phone || ''
    })
    setEditingUser(user)
    setShowUserModal(true)
  }

  const openEditLeaveType = (leaveType) => {
    setLeaveTypeForm({
      name: leaveType.name || '',
      code: leaveType.code || '',
      color: leaveType.color || '#3b82f6',
      defaultDays: leaveType.defaultDays || 12,
      isPaid: leaveType.isPaid ?? true,
      carryForward: leaveType.carryForward ?? false
    })
    setEditingLeaveType(leaveType)
    setShowLeaveTypeModal(true)
  }

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const tabs = [
    { key: 'users', label: 'Users', icon: '👥', count: users.length },
    { key: 'leaveTypes', label: 'Leave Types', icon: '🏖️', count: leaveTypes.length },
    { key: 'settings', label: 'Settings', icon: '⚙️' }
  ]

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'hr': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'manager': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    }
  }

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
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-400/20 dark:bg-red-500/10 rounded-full blur-3xl"></div>
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
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl sm:text-2xl">⚙️</span>
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Manage users & settings</p>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Users</span>
              <span className="text-lg">👥</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{users.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Active Today</span>
              <span className="text-lg">✅</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.activeToday || 0}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Pending Leaves</span>
              <span className="text-lg">⏳</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingLeaves || 0}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Leave Types</span>
              <span className="text-lg">🏖️</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{leaveTypes.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="inline-flex gap-1 sm:gap-2 p-1 bg-white/50 dark:bg-slate-800/50 rounded-xl backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search & Add */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => { resetUserForm(); setShowUserModal(true) }}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add User</span>
              </button>
            </div>

            {/* Users List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-slate-200 dark:divide-slate-700">
                {filteredUsers.map(user => (
                  <div key={user.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{user.name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{user.department || 'No dept'} • {user.employeeId || 'No ID'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 justify-end">
                      <button
                        onClick={() => openEditUser(user)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white text-sm">{user.name}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{user.department || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{user.employeeId || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => openEditUser(user)}
                              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl sm:text-3xl">👥</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 font-medium text-sm sm:text-base">No users found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leave Types Tab */}
        {activeTab === 'leaveTypes' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => { resetLeaveTypeForm(); setShowLeaveTypeModal(true) }}
                className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Leave Type</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {leaveTypes.map(type => (
                <div
                  key={type.id}
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: type.color }}
                    >
                      {type.code}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditLeaveType(type)}
                        className="p-1.5 text-slate-400 hover:text-blue-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{type.name}</h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Default Days</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{type.defaultDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Type</span>
                      <span className={`font-medium ${type.isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {type.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Carry Forward</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {type.carryForward ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {leaveTypes.length === 0 && (
                <div className="col-span-full text-center py-8 sm:py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl sm:text-3xl">🏖️</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 font-medium text-sm sm:text-base">No leave types found</p>
                  <p className="text-slate-500 text-xs sm:text-sm mt-1">Add leave types to enable leave management</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">System Settings</h2>
            <p className="text-sm text-slate-500">Settings panel coming soon...</p>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {editingUser ? 'Edit User' : 'Add User'}
              </h2>
              <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={userForm.department}
                    onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={userForm.employeeId}
                    onChange={(e) => setUserForm({ ...userForm, employeeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0"
                  />
                </div>
              </div>
            </form>

            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-medium"
              >
                {editingUser ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Type Modal */}
      {showLeaveTypeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {editingLeaveType ? 'Edit Leave Type' : 'Add Leave Type'}
              </h2>
              <button onClick={() => setShowLeaveTypeModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveLeaveType} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={leaveTypeForm.name}
                    onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Code</label>
                  <input
                    type="text"
                    value={leaveTypeForm.code}
                    onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, code: e.target.value.toUpperCase() })}
                    maxLength={4}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label>
                  <input
                    type="color"
                    value={leaveTypeForm.color}
                    onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, color: e.target.value })}
                    className="w-full h-10 rounded-xl border-0 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default Days</label>
                  <input
                    type="number"
                    value={leaveTypeForm.defaultDays}
                    onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, defaultDays: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm border-0"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={leaveTypeForm.isPaid}
                    onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, isPaid: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-green-500 focus:ring-green-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Paid Leave</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={leaveTypeForm.carryForward}
                    onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, carryForward: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-green-500 focus:ring-green-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Carry Forward</span>
                </label>
              </div>
            </form>

            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowLeaveTypeModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLeaveType}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-medium"
              >
                {editingLeaveType ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}