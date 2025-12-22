'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import ProtectedPage from '@/components/ProtectedPage'

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
  const [showUserModal, setShowUserModal] = useState(false)
  const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editingLeaveType, setEditingLeaveType] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', role: 'employee', department: '', employeeId: '', phone: ''
  })

  const [leaveTypeForm, setLeaveTypeForm] = useState({
    name: '', code: '', color: '#3b82f6', defaultDays: 12, isPaid: true, carryForward: false, description: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      // REMOVED old role check - ProtectedPage handles permissions now
      fetchData()
    }
  }, [status, router, session])

  const fetchData = async () => {
    try {
      const [usersRes, leaveTypesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/leave-types')
      ])
      if (usersRes.ok) setUsers(await usersRes.json())
      if (leaveTypesRes.ok) setLeaveTypes(await leaveTypesRes.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveUser = async (e) => {
    e.preventDefault()
    
    if (!editingUser && !userForm.password) {
      toast.error('Password is required for new users')
      return
    }
    if (!editingUser && userForm.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PATCH' : 'POST'
      const payload = { ...userForm }
      if (editingUser && !payload.password) delete payload.password

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        toast.success(editingUser ? 'User updated!' : 'User created!')
        setShowUserModal(false)
        resetUserForm()
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save')
      }
    } catch (error) {
      toast.error('Error saving user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    const confirmed = await confirm({
      title: 'Delete User',
      message: 'Are you sure? This cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('User deleted')
        fetchData()
      }
    } catch (error) {
      toast.error('Error')
    }
  }

  const handleSaveLeaveType = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editingLeaveType ? `/api/leave-types/${editingLeaveType.id}` : '/api/leave-types'
      const method = editingLeaveType ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveTypeForm)
      })

      if (res.ok) {
        toast.success(editingLeaveType ? 'Updated!' : 'Created!')
        setShowLeaveTypeModal(false)
        resetLeaveTypeForm()
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed')
      }
    } catch (error) {
      toast.error('Error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteLeaveType = async (id) => {
    const confirmed = await confirm({ title: 'Delete Leave Type', message: 'Are you sure?', confirmText: 'Delete', type: 'danger' })
    if (!confirmed) return
    try {
      const res = await fetch(`/api/leave-types/${id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Deleted'); fetchData() }
    } catch (error) { toast.error('Error') }
  }

  const resetUserForm = () => {
    setUserForm({ name: '', email: '', password: '', role: 'employee', department: '', employeeId: '', phone: '' })
    setEditingUser(null)
  }

  const resetLeaveTypeForm = () => {
    setLeaveTypeForm({ name: '', code: '', color: '#3b82f6', defaultDays: 12, isPaid: true, carryForward: false, description: '' })
    setEditingLeaveType(null)
  }

  const openEditUser = (user) => {
    setUserForm({ name: user.name || '', email: user.email || '', password: '', role: user.role || 'employee', department: user.department || '', employeeId: user.employeeId || '', phone: user.phone || '' })
    setEditingUser(user)
    setShowUserModal(true)
  }

  const openEditLeaveType = (lt) => {
    setLeaveTypeForm({ name: lt.name || '', code: lt.code || '', color: lt.color || '#3b82f6', defaultDays: lt.defaultDays || 12, isPaid: lt.isPaid ?? true, carryForward: lt.carryForward ?? false, description: lt.description || '' })
    setEditingLeaveType(lt)
    setShowLeaveTypeModal(true)
  }

  const filteredUsers = users.filter(user => user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || user.email?.toLowerCase().includes(searchQuery.toLowerCase()))

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      hr: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      manager: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      employee: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    }
    return styles[role] || styles.employee
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
  }

  return (
    <ProtectedPage module="admin" action="read">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <header className="mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link href="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </Link>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
                  <p className="text-sm text-slate-500">Manage users and settings</p>
                </div>
              </div>
              <div className="flex items-center gap-2"><DarkModeToggle /><UserNav /></div>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-blue-600">{users.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 mb-1">Admins</p>
            <p className="text-2xl font-bold text-red-600">{users.filter(u => u.role === 'admin').length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 mb-1">Employees</p>
            <p className="text-2xl font-bold text-green-600">{users.filter(u => u.role === 'employee').length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 mb-1">Leave Types</p>
            <p className="text-2xl font-bold text-purple-600">{leaveTypes.length}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Link href="/permissions" className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔐</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Permissions</h3>
                <p className="text-sm text-slate-500">Manage user access</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">
          {['users', 'leaveTypes'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
              {tab === 'users' ? 'Users' : 'Leave Types'}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input type="text" placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400" />
              <button onClick={() => { resetUserForm(); setShowUserModal(true) }} className="px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium">+ Add User</button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center"><p className="text-slate-500">No users found</p></div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">{user.name?.charAt(0) || '?'}</div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{user.name}</p>
                          <p className="text-sm text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>{user.role}</span>
                        <button onClick={() => openEditUser(user)} className="p-2 text-slate-400 hover:text-blue-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leave Types Tab */}
        {activeTab === 'leaveTypes' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => { resetLeaveTypeForm(); setShowLeaveTypeModal(true) }} className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium">+ Add Leave Type</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaveTypes.map(lt => (
                <div key={lt.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: lt.color }}>{lt.code}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${lt.isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{lt.isPaid ? 'Paid' : 'Unpaid'}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditLeaveType(lt)} className="p-1.5 text-slate-400 hover:text-blue-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      <button onClick={() => handleDeleteLeaveType(lt.id)} className="p-1.5 text-slate-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{lt.name}</h3>
                  <p className="text-sm text-slate-500">{lt.defaultDays} days/year</p>
                  {lt.description && <p className="text-xs text-slate-400 mt-2">{lt.description}</p>}
                </div>
              ))}
            </div>

            {leaveTypes.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 mb-2">No leave types found</p>
                <p className="text-sm text-slate-400">Run: npx prisma db seed</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editingUser ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                <input type="text" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password {editingUser ? '(leave blank to keep)' : '*'}</label>
                <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder={editingUser ? '••••••••' : 'Min 6 characters'} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" {...(!editingUser && { required: true, minLength: 6 })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                  <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm">
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
                  <input type="text" value={userForm.department} onChange={(e) => setUserForm({ ...userForm, department: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee ID</label>
                  <input type="text" value={userForm.employeeId} onChange={(e) => setUserForm({ ...userForm, employeeId: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input type="tel" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" />
                </div>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleSaveUser} disabled={submitting} className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">{submitting ? 'Saving...' : editingUser ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Type Modal */}
      {showLeaveTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editingLeaveType ? 'Edit Leave Type' : 'Add Leave Type'}</h2>
              <button onClick={() => setShowLeaveTypeModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <form onSubmit={handleSaveLeaveType} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                  <input type="text" value={leaveTypeForm.name} onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, name: e.target.value })} placeholder="Casual Leave" className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Code *</label>
                  <input type="text" value={leaveTypeForm.code} onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, code: e.target.value.toUpperCase() })} placeholder="CL" maxLength={4} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={leaveTypeForm.color} onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, color: e.target.value })} className="w-12 h-10 rounded-lg border-0 cursor-pointer" />
                    <input type="text" value={leaveTypeForm.color} onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, color: e.target.value })} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Days/Year</label>
                  <input type="number" value={leaveTypeForm.defaultDays} onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, defaultDays: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" min="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <input type="text" value={leaveTypeForm.description} onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, description: e.target.value })} placeholder="Brief description..." className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm" />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={leaveTypeForm.isPaid} onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, isPaid: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Paid Leave</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={leaveTypeForm.carryForward} onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, carryForward: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Carry Forward</span>
                </label>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button type="button" onClick={() => setShowLeaveTypeModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleSaveLeaveType} disabled={submitting} className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">{submitting ? 'Saving...' : editingLeaveType ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedPage>
  )
}