'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'

export const dynamic = 'force-dynamic'

const STATUS_OPTIONS = ['present', 'absent', 'office', 'field', 'wfh', 'leave', 'holiday', 'half_day']
const SESSION_OPTIONS = ['full_day', 'morning', 'afternoon']

const STATUS_COLORS = {
  present: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  office: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  field: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  wfh: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  leave: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  holiday: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  half_day: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export default function AdminAttendancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()
  const { confirm } = useConfirm()

  const [records, setRecords] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const [filterUserId, setFilterUserId] = useState('')
  const [filterStart, setFilterStart] = useState(today.slice(0, 7) + '-01')
  const [filterEnd, setFilterEnd] = useState(today)

  const [form, setForm] = useState({
    targetUserId: '', date: today, status: 'present',
    attendanceSession: 'full_day', punchIn: '', punchOut: '', notes: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated') {
      if (!['admin', 'hr'].includes(session.user.role)) { router.push('/'); return }
      fetchData()
    }
  }, [status])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ start: filterStart, end: filterEnd })
      if (filterUserId) params.set('userId', filterUserId)
      const [attRes, usersRes] = await Promise.all([
        fetch(`/api/attendance?${params}`),
        fetch('/api/users')
      ])
      if (attRes.ok) setRecords(await attRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const method = editingRecord ? 'PATCH' : 'POST'
      const body = editingRecord
        ? { id: editingRecord.id, status: form.status, attendanceSession: form.attendanceSession, punchIn: form.punchIn || null, punchOut: form.punchOut || null, notes: form.notes }
        : { targetUserId: form.targetUserId, date: form.date, status: form.status, session: form.attendanceSession, punchIn: form.punchIn || null, punchOut: form.punchOut || null, notes: form.notes }
      const url = editingRecord ? '/api/attendance' : '/api/attendance'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(editingRecord ? 'Record updated' : 'Record created')
      setShowModal(false)
      resetForm()
      fetchData()
    } catch (err) { toast.error(err.message) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Attendance', message: 'Delete this record permanently?', confirmText: 'Delete', type: 'danger' })
    if (!ok) return
    try {
      const res = await fetch(`/api/attendance?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Deleted')
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  const openEdit = (rec) => {
    setEditingRecord(rec)
    setForm({
      targetUserId: rec.userId,
      date: rec.date.split('T')[0],
      status: rec.status,
      attendanceSession: rec.session || 'full_day',
      punchIn: rec.punchIn ? new Date(rec.punchIn).toTimeString().slice(0, 5) : '',
      punchOut: rec.punchOut ? new Date(rec.punchOut).toTimeString().slice(0, 5) : '',
      notes: rec.notes || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingRecord(null)
    setForm({ targetUserId: '', date: today, status: 'present', attendanceSession: 'full_day', punchIn: '', punchOut: '', notes: '' })
  }

  if (status === 'loading') return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 hover:text-slate-700 dark:hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">Attendance Management</h1>
              <p className="text-xs text-slate-500">Admin: add, edit, delete attendance records</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { resetForm(); setShowModal(true) }} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium">+ Add Record</button>
            <DarkModeToggle />
            <UserNav />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Employee</label>
            <select value={filterUserId} onChange={e => setFilterUserId(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm">
              <option value="">All Employees</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-slate-800 dark:bg-slate-600 text-white rounded-lg text-sm font-medium">Apply</button>
        </div>

        {/* Records Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Session</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Punch In</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Punch Out</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {records.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-500">No records found</td></tr>
                  ) : records.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">{rec.user?.name?.charAt(0) || '?'}</div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{rec.user?.name}</p>
                            <p className="text-xs text-slate-500">{rec.user?.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[rec.status] || 'bg-slate-100 text-slate-600'}`}>{rec.status}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-500 capitalize">{rec.session?.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{rec.punchIn ? new Date(rec.punchIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{rec.punchOut ? new Date(rec.punchOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(rec)} className="p-1.5 text-slate-400 hover:text-blue-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                          <button onClick={() => handleDelete(rec.id)} className="p-1.5 text-slate-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-white">{editingRecord ? 'Edit Attendance' : 'Add Attendance Record'}</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="text-slate-400 hover:text-slate-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {!editingRecord && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee *</label>
                  <select value={form.targetUserId} onChange={e => setForm({ ...form, targetUserId: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm">
                    <option value="">Select employee...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.employeeId || u.email})</option>)}
                  </select>
                </div>
              )}
              {editingRecord && (
                <div className="text-sm bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-300">
                  Editing: <strong>{editingRecord.user?.name}</strong> — {new Date(editingRecord.date).toLocaleDateString()}
                </div>
              )}
              {!editingRecord && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status *</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Session</label>
                  <select value={form.attendanceSession} onChange={e => setForm({ ...form, attendanceSession: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm">
                    {SESSION_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Punch In</label>
                  <input type="time" value={form.punchIn} onChange={e => setForm({ ...form, punchIn: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Punch Out</label>
                  <input type="time" value={form.punchOut} onChange={e => setForm({ ...form, punchOut: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium">{submitting ? 'Saving...' : editingRecord ? 'Update' : 'Add Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
