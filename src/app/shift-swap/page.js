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
  accepted: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  approved: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
}

export default function ShiftSwapPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()
  const { confirm } = useConfirm()

  const [requests, setRequests] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('my')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ targetUserId: '', requestDate: '', targetDate: '', reason: '' })

  const isAdmin = ['admin', 'hr', 'manager'].includes(session?.user?.role)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated') fetchData()
  }, [status, activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [reqRes, usersRes] = await Promise.all([
        fetch('/api/shift-swap'),
        fetch('/api/users')
      ])
      if (reqRes.ok) setRequests(await reqRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
    } catch { toast.error('Failed to load data') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.targetUserId || !form.requestDate) return toast.error('Target user and date are required')
    setSubmitting(true)
    try {
      const res = await fetch('/api/shift-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Swap request sent')
      setShowModal(false)
      setForm({ targetUserId: '', requestDate: '', targetDate: '', reason: '' })
      fetchData()
    } catch (err) { toast.error(err.message) }
    finally { setSubmitting(false) }
  }

  const handleAction = async (id, action) => {
    try {
      const res = await fetch(`/api/shift-swap/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`Request ${action}ed`)
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  const myRequests = requests.filter(r => r.requesterId === session?.user?.id)
  const incomingRequests = requests.filter(r => r.targetUserId === session?.user?.id && r.status === 'pending')
  const pendingApproval = requests.filter(r => r.status === 'accepted')

  if (status === 'loading') return null

  return (
    <ProtectedPage module="shifts">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/shifts" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Shift Swap</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Request shift exchanges with colleagues</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                Request Swap
              </button>
              <NotificationBell />
              <DarkModeToggle />
              <UserNav />
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1 mb-6 w-fit">
            <button onClick={() => setActiveTab('my')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'my' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
              My Requests
            </button>
            <button onClick={() => setActiveTab('incoming')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'incoming' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
              Incoming {incomingRequests.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{incomingRequests.length}</span>}
            </button>
            {isAdmin && (
              <button onClick={() => setActiveTab('approval')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'approval' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
                Awaiting Approval {pendingApproval.length > 0 && <span className="ml-1 bg-orange-500 text-white text-xs rounded-full px-1.5">{pendingApproval.length}</span>}
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <div className="space-y-3">
              {(activeTab === 'my' ? myRequests : activeTab === 'incoming' ? incomingRequests : pendingApproval).length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-4xl mb-3">🔄</p>
                  <p className="text-slate-500">No requests found</p>
                </div>
              ) : (
                (activeTab === 'my' ? myRequests : activeTab === 'incoming' ? incomingRequests : pendingApproval).map(req => (
                  <div key={req.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[req.status]}`}>{req.status}</span>
                          {req.requester && <span className="text-sm text-slate-600 dark:text-slate-300">From: <strong>{req.requester.name}</strong></span>}
                          {req.targetUser && <span className="text-sm text-slate-600 dark:text-slate-300">To: <strong>{req.targetUser.name}</strong></span>}
                        </div>
                        <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-300 mb-1">
                          {req.requestDate && <span>Their date: <strong>{new Date(req.requestDate).toLocaleDateString()}</strong></span>}
                          {req.targetDate && <span>Your date: <strong>{new Date(req.targetDate).toLocaleDateString()}</strong></span>}
                        </div>
                        {req.reason && <p className="text-sm text-slate-500 dark:text-slate-400">{req.reason}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {activeTab === 'incoming' && req.status === 'pending' && (
                          <>
                            <button onClick={() => handleAction(req.id, 'accept')} className="px-3 py-1.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium hover:bg-green-200">Accept</button>
                            <button onClick={() => handleAction(req.id, 'reject')} className="px-3 py-1.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-200">Reject</button>
                          </>
                        )}
                        {activeTab === 'approval' && req.status === 'accepted' && isAdmin && (
                          <>
                            <button onClick={() => handleAction(req.id, 'approve')} className="px-3 py-1.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium hover:bg-green-200">Approve</button>
                            <button onClick={() => handleAction(req.id, 'reject')} className="px-3 py-1.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-200">Reject</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Request Swap Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="font-bold text-slate-900 dark:text-white">Request Shift Swap</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Swap With *</label>
                  <select value={form.targetUserId} onChange={e => setForm({ ...form, targetUserId: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm">
                    <option value="">Select colleague...</option>
                    {users.filter(u => u.id !== session?.user?.id).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Your Date *</label>
                    <input type="date" value={form.requestDate} onChange={e => setForm({ ...form, requestDate: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Their Date</label>
                    <input type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                  <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={2} placeholder="Why do you need to swap?" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm resize-none" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
                    {submitting ? 'Sending...' : 'Send Request'}
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
