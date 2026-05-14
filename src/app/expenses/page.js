'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import ProtectedPage from '@/components/ProtectedPage'

const CATEGORIES = [
  { value: 'travel',          label: 'Travel',           icon: '✈️' },
  { value: 'food',            label: 'Food & Meals',     icon: '🍽️' },
  { value: 'accommodation',   label: 'Accommodation',    icon: '🏨' },
  { value: 'fuel',            label: 'Fuel',             icon: '⛽' },
  { value: 'office-supplies', label: 'Office Supplies',  icon: '📎' },
  { value: 'other',           label: 'Other',            icon: '📦' },
]

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700  dark:bg-amber-500/20 dark:text-amber-400'  },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700  dark:bg-green-500/20 dark:text-green-400'  },
  rejected: { label: 'Rejected', color: 'bg-red-100   text-red-700    dark:bg-red-500/20   dark:text-red-400'    },
  paid:     { label: 'Paid',     color: 'bg-blue-100  text-blue-700   dark:bg-blue-500/20  dark:text-blue-400'   },
}

function fmt(n) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0) }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

export default function ExpensesPage() {
  const { data: session } = useSession()
  const [claims, setClaims]       = useState([])
  const [stats, setStats]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('mine')
  const [showForm, setShowForm]   = useState(false)
  const [selected, setSelected]   = useState(null)
  const [actionModal, setActionModal] = useState(null) // { claim, type: 'approve'|'reject'|'pay' }
  const [rejNote, setRejNote]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]         = useState(null)
  const fileRef = useRef(null)

  const isPrivileged = ['admin', 'hr', 'manager'].includes(session?.user?.role)

  const [form, setForm] = useState({ title: '', category: 'travel', amount: '', date: new Date().toISOString().split('T')[0], description: '', receiptUrl: '' })

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const view = tab === 'mine' ? 'mine' : 'all'
      const res  = await fetch(`/api/expenses?view=${view}`)
      const data = await res.json()
      setClaims(data.claims || [])
      setStats(data.stats  || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (session) load() }, [session, tab])

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({ ...f, receiptUrl: reader.result }))
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Expense claim submitted!')
      setShowForm(false)
      setForm({ title: '', category: 'travel', amount: '', date: new Date().toISOString().split('T')[0], description: '', receiptUrl: '' })
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAction = async () => {
    if (!actionModal) return
    setSubmitting(true)
    try {
      const body = { action: actionModal.type }
      if (actionModal.type === 'reject') body.rejectionReason = rejNote
      const res = await fetch(`/api/expenses/${actionModal.claim.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast(`Claim ${actionModal.type === 'pay' ? 'marked as paid' : actionModal.type + 'd'}!`)
      setActionModal(null)
      setRejNote('')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this claim?')) return
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    load()
  }

  const statMap = {}
  stats.forEach(s => { statMap[s.status] = { count: s._count._all, amount: s._sum.amount || 0 } })
  const pending  = statMap.pending  || { count: 0, amount: 0 }
  const approved = statMap.approved || { count: 0, amount: 0 }
  const paid     = statMap.paid     || { count: 0, amount: 0 }
  const total    = stats.reduce((a, s) => a + (s._sum.amount || 0), 0)

  return (
    <ProtectedPage module="attendance">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
            {toast.msg}
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Expense Claims</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Submit and track reimbursement requests</p>
            </div>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
              <span className="text-lg">+</span> New Claim
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Pending',  value: fmt(pending.amount),  sub: `${pending.count} claims`,  color: 'border-amber-400',  icon: '⏳' },
              { label: 'Approved', value: fmt(approved.amount), sub: `${approved.count} claims`, color: 'border-green-400',  icon: '✅' },
              { label: 'Paid',     value: fmt(paid.amount),     sub: `${paid.count} claims`,     color: 'border-blue-400',   icon: '💸' },
              { label: 'Total',    value: fmt(total),           sub: `${stats.reduce((a,s)=>a+s._count._all,0)} claims`,     color: 'border-slate-400',  icon: '📊' },
            ].map(s => (
              <div key={s.label} className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border-l-4 ${s.color} shadow-sm`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</span>
                  <span className="text-lg">{s.icon}</span>
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          {isPrivileged && (
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
              {[{ key: 'mine', label: 'My Claims' }, { key: 'all', label: 'All Claims' }].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Claims Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : claims.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🧾</div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">No expense claims yet</p>
                <p className="text-sm text-slate-400 mt-1">Click "New Claim" to submit your first expense</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      {['Title', 'Category', 'Amount', 'Date', isPrivileged && tab === 'all' ? 'Employee' : null, 'Status', 'Actions'].filter(Boolean).map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {claims.map(claim => {
                      const cat = CATEGORIES.find(c => c.value === claim.category)
                      const sc  = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending
                      return (
                        <tr key={claim.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 dark:text-white">{claim.title}</p>
                            {claim.description && <p className="text-xs text-slate-500 truncate max-w-[200px]">{claim.description}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
                              {cat?.icon} {cat?.label || claim.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{fmt(claim.amount)}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{fmtDate(claim.date)}</td>
                          {isPrivileged && tab === 'all' && (
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800 dark:text-slate-200">{claim.user?.name}</p>
                              <p className="text-xs text-slate-500">{claim.user?.department}</p>
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${sc.color}`}>{sc.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {claim.receiptUrl && (
                                <button onClick={() => setSelected(claim)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="View receipt">👁️</button>
                              )}
                              {isPrivileged && claim.status === 'pending' && (
                                <>
                                  <button onClick={() => setActionModal({ claim, type: 'approve' })} className="px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-400 rounded-lg transition-colors">Approve</button>
                                  <button onClick={() => setActionModal({ claim, type: 'reject' })} className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 rounded-lg transition-colors">Reject</button>
                                </>
                              )}
                              {['admin', 'hr'].includes(session?.user?.role) && claim.status === 'approved' && (
                                <button onClick={() => setActionModal({ claim, type: 'pay' })} className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-400 rounded-lg transition-colors">Mark Paid</button>
                              )}
                              {claim.userId === session?.user?.id && claim.status === 'pending' && (
                                <button onClick={() => handleDelete(claim.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete">🗑️</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* New Claim Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Expense Claim</h2>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                  <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Client meeting lunch" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                    <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹) *</label>
                    <input required type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                  <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional details..." className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Receipt</label>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleReceiptUpload} className="hidden" />
                  {form.receiptUrl ? (
                    <div className="relative">
                      <img src={form.receiptUrl} alt="Receipt" className="w-full h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
                      <button type="button" onClick={() => setForm(f => ({ ...f, receiptUrl: '' }))} className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()} className="w-full py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm">
                      📎 Click to upload receipt
                    </button>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                    {submitting ? 'Submitting…' : 'Submit Claim'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Receipt Preview */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white">{selected.title} — Receipt</h3>
                <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">✕</button>
              </div>
              <div className="p-4">
                {selected.receiptUrl?.startsWith('data:image') ? (
                  <img src={selected.receiptUrl} alt="Receipt" className="w-full rounded-xl" />
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <div className="text-5xl mb-2">📄</div>
                    <p className="text-sm">PDF receipt attached</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Approve / Reject / Pay Modal */}
        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                {actionModal.type === 'pay' ? 'Mark as Paid' : actionModal.type} Claim
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <strong>{actionModal.claim.title}</strong> — {fmt(actionModal.claim.amount)}
              </p>
              {actionModal.type === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                  <textarea rows={2} value={rejNote} onChange={e => setRejNote(e.target.value)} placeholder="Reason for rejection..." className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none" />
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setActionModal(null); setRejNote('') }} className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                <button onClick={handleAction} disabled={submitting} className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-colors ${actionModal.type === 'approve' || actionModal.type === 'pay' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {submitting ? 'Processing…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  )
}
