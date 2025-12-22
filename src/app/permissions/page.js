'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'

export const dynamic = 'force-dynamic'

// =====================================================
// MODULES - ONLY YOUR EXISTING PAGES
// =====================================================
const MODULES = [
  { id: 'timesheet', name: 'Time Sheet', icon: '⏱️', description: 'Punch-in/out and time tracking' },
  { id: 'leave', name: 'Leave', icon: '🏖️', description: 'Apply and manage leaves' },
  { id: 'shifts', name: 'Shifts', icon: '🕐', description: 'View and manage shifts' },
  { id: 'notifications', name: 'Notifications', icon: '🔔', description: 'View notifications' },
  { id: 'team', name: 'Team', icon: '👥', description: 'Team dashboard access' },
  { id: 'analytics', name: 'Analytics', icon: '📊', description: 'View analytics and reports' },
  { id: 'payroll', name: 'Payroll', icon: '💰', description: 'View and manage payroll' },
  { id: 'admin', name: 'Admin', icon: '⚙️', description: 'Admin dashboard access' }
]

const ACTIONS = [
  { id: 'canRead', name: 'Read', color: 'blue' },
  { id: 'canWrite', name: 'Write', color: 'green' },
  { id: 'canEdit', name: 'Edit', color: 'amber' },
  { id: 'canDelete', name: 'Delete', color: 'red' }
]

export default function PermissionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [permissions, setPermissions] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (session.user.role !== 'admin') {
        showToast('Only admins can manage permissions', 'error')
        router.push('/')
        return
      }
      fetchUsers()
    }
  }, [status, router, session])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.filter(u => u.role !== 'admin'))
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserPermissions = async (userId) => {
    try {
      const res = await fetch(`/api/permissions?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setPermissions(data.permissions || {})
      }
    } catch (error) {
      console.error('Error:', error)
      const emptyPerms = {}
      MODULES.forEach(m => {
        emptyPerms[m.id] = { canRead: false, canWrite: false, canEdit: false, canDelete: false }
      })
      setPermissions(emptyPerms)
    }
  }

  const selectUser = async (user) => {
    setSelectedUser(user)
    await fetchUserPermissions(user.id)
  }

  const togglePermission = (module, action) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module]?.[action]
      }
    }))
  }

  const toggleAllForModule = (module) => {
    const current = permissions[module] || {}
    const allEnabled = current.canRead && current.canWrite && current.canEdit && current.canDelete
    
    setPermissions(prev => ({
      ...prev,
      [module]: {
        canRead: !allEnabled,
        canWrite: !allEnabled,
        canEdit: !allEnabled,
        canDelete: !allEnabled
      }
    }))
  }

  const setPreset = (preset) => {
    const newPermissions = {}
    
    if (preset === 'full') {
      // Full access to all modules
      MODULES.forEach(m => {
        newPermissions[m.id] = { canRead: true, canWrite: true, canEdit: true, canDelete: true }
      })
    } else if (preset === 'readonly') {
      // Read only for all modules
      MODULES.forEach(m => {
        newPermissions[m.id] = { canRead: true, canWrite: false, canEdit: false, canDelete: false }
      })
    } else if (preset === 'none') {
      // No access to any module
      MODULES.forEach(m => {
        newPermissions[m.id] = { canRead: false, canWrite: false, canEdit: false, canDelete: false }
      })
    } else if (preset === 'employee') {
      // Standard employee: only basic access
      newPermissions['timesheet'] = { canRead: true, canWrite: true, canEdit: false, canDelete: false }
      newPermissions['leave'] = { canRead: true, canWrite: true, canEdit: false, canDelete: false }
      newPermissions['shifts'] = { canRead: true, canWrite: false, canEdit: false, canDelete: false }
      newPermissions['notifications'] = { canRead: true, canWrite: false, canEdit: false, canDelete: false }
      // No access to these
      newPermissions['team'] = { canRead: false, canWrite: false, canEdit: false, canDelete: false }
      newPermissions['analytics'] = { canRead: false, canWrite: false, canEdit: false, canDelete: false }
      newPermissions['payroll'] = { canRead: false, canWrite: false, canEdit: false, canDelete: false }
      newPermissions['admin'] = { canRead: false, canWrite: false, canEdit: false, canDelete: false }
    } else if (preset === 'manager') {
      // Manager: more access but not admin
      newPermissions['timesheet'] = { canRead: true, canWrite: true, canEdit: true, canDelete: false }
      newPermissions['leave'] = { canRead: true, canWrite: true, canEdit: true, canDelete: false }
      newPermissions['shifts'] = { canRead: true, canWrite: true, canEdit: false, canDelete: false }
      newPermissions['notifications'] = { canRead: true, canWrite: false, canEdit: false, canDelete: false }
      newPermissions['team'] = { canRead: true, canWrite: false, canEdit: false, canDelete: false }
      newPermissions['analytics'] = { canRead: true, canWrite: false, canEdit: false, canDelete: false }
      newPermissions['payroll'] = { canRead: false, canWrite: false, canEdit: false, canDelete: false }
      newPermissions['admin'] = { canRead: false, canWrite: false, canEdit: false, canDelete: false }
    }
    
    setPermissions(newPermissions)
  }

  const savePermissions = async () => {
    if (!selectedUser) return
    
    setSaving(true)
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          permissions
        })
      })

      if (res.ok) {
        showToast('Permissions saved successfully!')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to save', 'error')
      }
    } catch (error) {
      showToast('Error saving permissions', 'error')
    } finally {
      setSaving(false)
    }
  }

  const resetPermissions = async () => {
    if (!selectedUser) return
    
    if (!confirm('Reset all permissions for this user?')) return
    
    try {
      const res = await fetch(`/api/permissions?userId=${selectedUser.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        showToast('Permissions reset to defaults')
        await fetchUserPermissions(selectedUser.id)
      }
    } catch (error) {
      showToast('Error resetting permissions', 'error')
    }
  }

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleBadge = (role) => {
    const styles = {
      hr: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      manager: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      employee: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    }
    return styles[role] || styles.employee
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
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
                <Link href="/admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Permission Management</h1>
                  <p className="text-sm text-slate-500">Control what each user can access</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DarkModeToggle />
                <UserNav />
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => selectUser(user)}
                    className={`w-full p-4 text-left border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                      selectedUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                        {user.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </button>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="p-8 text-center text-slate-500">No users found</div>
                )}
              </div>
            </div>
          </div>

          {/* Permissions Editor */}
          <div className="lg:col-span-2">
            {selectedUser ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* User Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                        {selectedUser.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h2 className="font-semibold text-slate-900 dark:text-white">{selectedUser.name}</h2>
                        <p className="text-sm text-slate-500">{selectedUser.email}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadge(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                  </div>

                  {/* Presets */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-xs text-slate-500 mr-2 self-center">Presets:</span>
                    <button onClick={() => setPreset('employee')} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600">Employee</button>
                    <button onClick={() => setPreset('manager')} className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-200">Manager</button>
                    <button onClick={() => setPreset('readonly')} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-200">Read Only</button>
                    <button onClick={() => setPreset('full')} className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-200">Full Access</button>
                    <button onClick={() => setPreset('none')} className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-200">No Access</button>
                  </div>
                </div>

                {/* Permission Matrix */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Module</th>
                        {ACTIONS.map(action => (
                          <th key={action.id} className="text-center px-3 py-3 text-xs font-semibold text-slate-500">
                            {action.name}
                          </th>
                        ))}
                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">All</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {MODULES.map(module => (
                        <tr key={module.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{module.icon}</span>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white text-sm">{module.name}</p>
                                <p className="text-xs text-slate-500 hidden sm:block">{module.description}</p>
                              </div>
                            </div>
                          </td>
                          {ACTIONS.map(action => (
                            <td key={action.id} className="text-center px-3 py-3">
                              <button
                                onClick={() => togglePermission(module.id, action.id)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                  permissions[module.id]?.[action.id]
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                }`}
                              >
                                {permissions[module.id]?.[action.id] ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )}
                              </button>
                            </td>
                          ))}
                          <td className="text-center px-3 py-3">
                            <button
                              onClick={() => toggleAllForModule(module.id)}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs hover:bg-slate-200 dark:hover:bg-slate-600"
                            >
                              Toggle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={resetPermissions}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    Reset to Defaults
                  </button>
                  <button
                    onClick={savePermissions}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Permissions'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Select a User</h3>
                <p className="text-sm text-slate-500">Choose a user from the list to manage their permissions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}