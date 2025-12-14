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

export default function ShiftManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()
  const { confirm } = useConfirm()

  const [loading, setLoading] = useState(true)
  const [shifts, setShifts] = useState([])
  const [users, setUsers] = useState([])
  const [userShifts, setUserShifts] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    startTime: '09:00',
    endTime: '17:00',
    breakMinutes: 60,
    graceMinutes: 15,
    color: '#3b82f6'
  })
  const [assignData, setAssignData] = useState({
    userId: '',
    shiftId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (!['admin', 'hr'].includes(session?.user?.role)) {
        router.push('/')
        toast.error('Access denied. Admin/HR privileges required.')
      } else {
        fetchData()
      }
    }
  }, [status, session, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [shiftsRes, usersRes, userShiftsRes] = await Promise.all([
        fetch('/api/shifts'),
        fetch('/api/users'),
        fetch('/api/shifts/assignments')
      ])

      if (shiftsRes.ok) setShifts(await shiftsRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
      if (userShiftsRes.ok) setUserShifts(await userShiftsRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load shift data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const url = editingShift ? '/api/shifts/' + editingShift.id : '/api/shifts'
      const method = editingShift ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success(editingShift ? 'Shift updated!' : 'Shift created!')
        setShowAddModal(false)
        setEditingShift(null)
        resetForm()
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save shift')
      }
    } catch (error) {
      toast.error('Error saving shift')
    }
  }

  const handleAssign = async (e) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/shifts/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignData)
      })

      if (res.ok) {
        toast.success('Shift assigned successfully!')
        setShowAssignModal(false)
        setAssignData({
          userId: '',
          shiftId: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: ''
        })
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to assign shift')
      }
    } catch (error) {
      toast.error('Error assigning shift')
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Shift',
      message: 'Are you sure you want to delete this shift? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    })

    if (!confirmed) return

    try {
      const res = await fetch('/api/shifts/' + id, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Shift deleted')
        fetchData()
      } else {
        toast.error('Failed to delete shift')
      }
    } catch (error) {
      toast.error('Error deleting shift')
    }
  }

  const handleRemoveAssignment = async (id) => {
    const confirmed = await confirm({
      title: 'Remove Assignment',
      message: 'Remove this shift assignment?',
      confirmText: 'Remove',
      type: 'warning'
    })

    if (!confirmed) return

    try {
      const res = await fetch('/api/shifts/assignments/' + id, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Assignment removed')
        fetchData()
      }
    } catch (error) {
      toast.error('Error removing assignment')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      startTime: '09:00',
      endTime: '17:00',
      breakMinutes: 60,
      graceMinutes: 15,
      color: '#3b82f6'
    })
  }

  const openEdit = (shift) => {
    setEditingShift(shift)
    setFormData({
      name: shift.name,
      code: shift.code,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakMinutes: shift.breakMinutes,
      graceMinutes: shift.graceMinutes,
      color: shift.color
    })
    setShowAddModal(true)
  }

  const calculateShiftHours = (start, end, breakMins) => {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    let totalMins = (eh * 60 + em) - (sh * 60 + sm)
    if (totalMins < 0) totalMins += 24 * 60 // Handle overnight shifts
    totalMins -= breakMins
    return (totalMins / 60).toFixed(1)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-400/20 dark:bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-3xl"></div>
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
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🕐</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Shift Management</h1>
                  <p className="text-slate-500 dark:text-slate-400">Manage work shifts & schedules</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { resetForm(); setEditingShift(null); setShowAddModal(true) }}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Shift
                </button>
                <DarkModeToggle />
                <NotificationBell />
                <UserNav />
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shifts List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Shifts ({shifts.length})</h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {shifts.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No shifts created yet. Click &quot;Add Shift&quot; to create one.
                </div>
              ) : (
                shifts.map(shift => (
                  <div key={shift.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: shift.color }}
                        >
                          {shift.code}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{shift.name}</h3>
                          <p className="text-sm text-slate-500">
                            {shift.startTime} - {shift.endTime} ({calculateShiftHours(shift.startTime, shift.endTime, shift.breakMinutes)}h)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={'px-2 py-1 text-xs rounded-lg ' + (
                          shift.isActive
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        )}>
                          {shift.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => openEdit(shift)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(shift.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                      <span>Break: {shift.breakMinutes}min</span>
                      <span>Grace: {shift.graceMinutes}min</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Shift Assignments */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Assignments ({userShifts.length})</h2>
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
              >
                Assign Shift
              </button>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
              {userShifts.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No shift assignments yet.
                </div>
              ) : (
                userShifts.map(assignment => (
                  <div key={assignment.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                          {assignment.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">{assignment.user?.name}</h3>
                          <div className="flex items-center gap-2 text-sm">
                            <span 
                              className="px-2 py-0.5 rounded text-white text-xs font-medium"
                              style={{ backgroundColor: assignment.shift?.color }}
                            >
                              {assignment.shift?.name}
                            </span>
                            <span className="text-slate-500">
                              {new Date(assignment.startDate).toLocaleDateString()}
                              {assignment.endDate ? ' - ' + new Date(assignment.endDate).toLocaleDateString() : ' - Present'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Shift Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingShift ? 'Edit Shift' : 'Add New Shift'}
              </h2>
              <button onClick={() => { setShowAddModal(false); setEditingShift(null) }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shift Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Morning"
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="MOR"
                    maxLength={4}
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Break (mins)</label>
                  <input
                    type="number"
                    value={formData.breakMinutes}
                    onChange={(e) => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="180"
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Grace (mins)</label>
                  <input
                    type="number"
                    value={formData.graceMinutes}
                    onChange={(e) => setFormData({ ...formData, graceMinutes: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="60"
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 rounded-lg cursor-pointer"
                  />
                  <div className="flex gap-2">
                    {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={'w-8 h-8 rounded-lg transition-transform ' + (formData.color === color ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : '')}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingShift(null) }}
                  className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium"
                >
                  {editingShift ? 'Update' : 'Create'} Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Shift Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assign Shift</h2>
              <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAssign} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee</label>
                <select
                  value={assignData.userId}
                  onChange={(e) => setAssignData({ ...assignData, userId: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl"
                >
                  <option value="">Select employee...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shift</label>
                <select
                  value={assignData.shiftId}
                  onChange={(e) => setAssignData({ ...assignData, shiftId: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl"
                >
                  <option value="">Select shift...</option>
                  {shifts.filter(s => s.isActive).map(shift => (
                    <option key={shift.id} value={shift.id}>{shift.name} ({shift.startTime} - {shift.endTime})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={assignData.startDate}
                    onChange={(e) => setAssignData({ ...assignData, startDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date (opt)</label>
                  <input
                    type="date"
                    value={assignData.endDate}
                    onChange={(e) => setAssignData({ ...assignData, endDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600"
                >
                  Assign Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}