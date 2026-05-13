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
import ProtectedPage from '@/components/ProtectedPage'

export const dynamic = 'force-dynamic'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  approved: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
}

export default function RegularizationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()
  const { confirm } = useConfirm()

  const [activeTab, setActiveTab] = useState('my')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectingId, setRejectingId] = useState(null)

  const [form, setForm] = useState({
    date: '',
    punchIn: '',
    punchOut: '',
    reason: ''
  })

  const isAdmin = ['admin', 'hr', 'manager'].includes(session?.user?.role)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated') fetchRequests()
  }, [status, activeTab])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const url = activeTab === 'pending' ? '/api/regularization?status=pending' : '/api/regularization'
      const res = await fetch(url)
      if (res.ok) setRequests(await res.json())
    } catch { toast.error('Failed to load requests') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.date || !form.reason) return toast.error('Date and reason are required')
    setSubmitting(true)
    try {
      const res = await fetch('/api/regularization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Regularization request submitted')
      setShowModal(false)
      setForm({ date: '', punchIn: '', punchOut: '', reason: '' })
      fetchRequests()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (id) => {
    const ok = await confirm('Approve this regularization request?', { confirmText: 'Approve', type: 'success' })
    if (!ok) return
    try {
      const res = await fetch(`/api/regularization/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Request approved')
      fetchRequests()
    } catch (err) { toast.error(err.message) }
  }

  const handleReject = async (id) => {
    if (!rejectNote.trim()) return toast.error('Please provide a rejection reason')
    try {
      const res = await fetch(`/api/regularization/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', note: rejectNote })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Request rejected')
      setRejectingId(null)
      setRejectNote('')
      fetchRequests()
    } catch (err) { toast.error(err.message) }
  }

  const handleCancel = async (id) => {
    const ok = await confirm('Cancel this regularization request?', { confirmText: 'Cancel Request', type: 'danger' })
    if (!ok) return
    try {
      const res = await fetch(`/api/regularization/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Request cancelled')
      fetchRequests()
    } catch (err) { toast.error(err.message) }
  }

  const myRequests = requests.filter(r => r.userId === session?.user?.id)
  const pendingApprovals = requests.filter(r => r.userId !== session?.user?.id && r.status === 'pending')

  if (status === 'loading') return null

  return (
    <ProtectedPage module="attendance">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Attendance Regularization</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Correct missed punch-in/out records</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <DarkModeToggle />
              <UserNav />
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Tabs */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
              <button onClick={() => setActiveTab('my')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'my' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                My Requests
              </button>
              {isAdmin && (
                <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                  Pending Approvals {pendingApprovals.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{pendingApprovals.length}</span>}
                </button>
              )}
            </div>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Request
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <div className="space-y-3">
              {(activeTab === 'my' ? myRequests : pendingApprovals).length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-slate-500 dark:text-slate-400">No {activeTab === 'my' ? 'requests' : 'pending approvals'} found</p>
                </div>
              ) : (
                (activeTab === 'my' ? myRequests : pendingApprovals).map(req => (
                  <div key={req.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {activeTab === 'pending' && req.user && (
                            <span className="font-semibold text-slate-900 dark:text-white">{req.user.name}</span>
                          )}
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {new Date(req.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[req.status]}`}>{req.status}</span>
                        </div>
                        <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-300 mb-2">
                          {req.requestedPunchIn && <span>Punch In: <strong>{new Date(req.requestedPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>}
                          {req.requestedPunchOut && <span>Punch Out: <strong>{new Date(req.requestedPunchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{req.reason}</p>
                        {req.managerNote && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">Note: {req.managerNote}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {activeTab === 'pending' && req.status === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(req.id)} className="px-3 py-1.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors">Approve</button>
                            <button onClick={() => setRejectingId(req.id)} className="px-3 py-1.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors">Reject</button>
                          </>
                        )}
                        {activeTab === 'my' && req.status === 'pending' && (
                          <button onClick={() => handleCancel(req.id)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors">Cancel</button>
                        )}
                      </div>
                    </div>
                    {rejectingId === req.id && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <input
                          type="text"
                          placeholder="Rejection reason..."
                          value={rejectNote}
                          onChange={e => setRejectNote(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white mb-2"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleReject(req.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium">Confirm Reject</button>
                          <button onClick={() => { setRejectingId(null); setRejectNote('') }} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="font-bold text-slate-900 dark:text-white">New Regularization Request</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required max={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason *</label>
                  <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required rows={3} placeholder="Explain why attendance needs correction..." className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  )
}
