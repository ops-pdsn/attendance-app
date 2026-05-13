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

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
}

export default function AdminLeavePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()
  const { confirm } = useConfirm()

  const [requests, setRequests] = useState([])
  const [users, setUsers] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUserId, setFilterUserId] = useState('')

  const [form, setForm] = useState({
    userId: '', leaveTypeId: '', startDate: '', endDate: '',
    reason: '', type: 'full'
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
      const params = new URLSearchParams({ team: 'true' })
      if (filterStatus) params.set('status', filterStatus)
      if (filterUserId) params.set('userId', filterUserId)
      const [reqRes, usersRes, ltRes] = await Promise.all([
        fetch(`/api/leave-requests?${params}`),
        fetch('/api/users'),
        fetch('/api/leave-types')
      ])
      if (reqRes.ok) setRequests(await reqRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
      if (ltRes.ok) setLeaveTypes(await ltRes.json())
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, adminOverride: true })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Leave request created')
      setShowModal(false)
      setForm({ userId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '', type: 'full' })
      fetchData()
    } catch (err) { toast.error(err.message) }
    finally { setSubmitting(false) }
  }

  const handleAction = async (id, action, note = '') => {
    try {
      const res = await fetch(`/api/leave-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason: note })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`Request ${action}d`)
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Leave Request', message: 'Delete this record permanently?', confirmText: 'Delete', type: 'danger' })
    if (!ok) return
    try {
      const res = await fetch(`/api/leave-requests/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Deleted')
      fetchData()
    } catch (err) { toast.error(err.message) }
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
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">Leave Manager</h1>
              <p className="text-xs text-slate-500">Admin: create, approve, reject, delete leave requests</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-cyan-500 text-white rounded-xl text-sm font-medium">+ Create Leave</button>
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
            <label className="block text-xs text-slate-500 mb-1">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm">
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-slate-800 dark:bg-slate-600 text-white rounded-lg text-sm font-medium">Apply</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Leave Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Dates</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Days</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {requests.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-500">No leave requests found</td></tr>
                  ) : requests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{req.user?.name}</p>
                        <p className="text-xs text-slate-500">{req.user?.department}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{req.leaveType?.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {new Date(req.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} — {new Date(req.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-slate-900 dark:text-white">{req.days}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[req.status] || ''}`}>{req.status}</span></td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {req.status === 'pending' && (
                            <>
                              <button onClick={() => handleAction(req.id, 'approve')} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200">Approve</button>
                              <button onClick={() => handleAction(req.id, 'reject')} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200">Reject</button>
                            </>
                          )}
                          <button onClick={() => handleDelete(req.id)} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs font-medium hover:bg-red-100 hover:text-red-600">Delete</button>
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

      {/* Create Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-white">Create Leave Request</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee *</label>
                <select value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm">
                  <option value="">Select employee...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Leave Type *</label>
                <select value={form.leaveTypeId} onChange={e => setForm({ ...form, leaveTypeId: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm">
                  <option value="">Select type...</option>
                  {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date *</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm">
                  <option value="full">Full Day</option>
                  <option value="half">Half Day</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium">{submitting ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
