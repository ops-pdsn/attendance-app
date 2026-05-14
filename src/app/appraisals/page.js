'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ProtectedPage from '@/components/ProtectedPage'

const STATUS_CONFIG = {
  draft:      { label: 'Draft',      color: 'bg-slate-100  text-slate-600  dark:bg-slate-700    dark:text-slate-400',  step: 0 },
  submitted:  { label: 'Submitted',  color: 'bg-blue-100   text-blue-700   dark:bg-blue-500/20  dark:text-blue-400',   step: 1 },
  reviewed:   { label: 'Reviewed',   color: 'bg-amber-100  text-amber-700  dark:bg-amber-500/20 dark:text-amber-400',  step: 2 },
  finalized:  { label: 'Finalized',  color: 'bg-green-100  text-green-700  dark:bg-green-500/20 dark:text-green-400',  step: 3 },
}

function StarRating({ value, onChange, readonly }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`text-2xl transition-transform ${readonly ? '' : 'hover:scale-110 cursor-pointer'} ${star <= (value || 0) ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
        >
          ★
        </button>
      ))}
      {value && <span className="ml-1 text-sm text-slate-600 dark:text-slate-400 self-center font-medium">{value}/5</span>}
    </div>
  )
}

const DEFAULT_GOALS = [
  { title: '', target: '', achievement: '', score: '' },
]

export default function AppraisalsPage() {
  const { data: session } = useSession()
  const [appraisals, setAppraisals] = useState([])
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('mine')
  const [selected, setSelected]     = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]           = useState(null)

  const isAdmin    = ['admin', 'hr'].includes(session?.user?.role)
  const isManager  = session?.user?.role === 'manager'

  const [selfForm, setSelfForm] = useState({ selfScore: 0, selfComments: '', goals: DEFAULT_GOALS })
  const [mgrForm, setMgrForm]   = useState({ managerScore: 0, managerComments: '' })
  const [createForm, setCreateForm] = useState({ period: '', periodStart: '', periodEnd: '', reviewerId: '', userIds: [] })

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const view = tab === 'team' ? 'team' : tab === 'all' ? 'all' : 'mine'
      const res  = await fetch(`/api/appraisals?view=${view}`)
      const data = await res.json()
      setAppraisals(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    const res  = await fetch('/api/users?active=true')
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : data.users || [])
  }

  useEffect(() => { if (session) { load(); if (isAdmin || isManager) loadUsers() } }, [session, tab])

  const openDetail = (ap) => {
    setSelected(ap)
    setSelfForm({
      selfScore:    ap.selfScore    || 0,
      selfComments: ap.selfComments || '',
      goals:        ap.goals ? (typeof ap.goals === 'string' ? JSON.parse(ap.goals) : ap.goals) : DEFAULT_GOALS,
    })
    setMgrForm({
      managerScore:    ap.managerScore    || 0,
      managerComments: ap.managerComments || '',
    })
  }

  const handleSelfSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/appraisals/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit-self', ...selfForm, goals: selfForm.goals }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Self-review submitted!')
      setSelected(null)
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMgrReview = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/appraisals/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review', ...mgrForm }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Manager review saved!')
      setSelected(null)
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinalize = async (id) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/appraisals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Appraisal finalized!')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/appraisals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Appraisal cycle created!')
      setShowCreate(false)
      setCreateForm({ period: '', periodStart: '', periodEnd: '', reviewerId: '', userIds: [] })
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const updateGoal = (idx, field, val) => {
    setSelfForm(f => {
      const goals = [...f.goals]
      goals[idx] = { ...goals[idx], [field]: val }
      return { ...f, goals }
    })
  }

  const addGoal = () => setSelfForm(f => ({ ...f, goals: [...f.goals, { title: '', target: '', achievement: '', score: '' }] }))
  const removeGoal = (idx) => setSelfForm(f => ({ ...f, goals: f.goals.filter((_, i) => i !== idx) }))

  const tabs = [
    { key: 'mine',  label: 'My Appraisals' },
    ...(isManager ? [{ key: 'team', label: 'Team Reviews' }] : []),
    ...(isAdmin   ? [{ key: 'all',  label: 'All'          }] : []),
  ]

  const isOwner      = (ap) => ap.userId      === session?.user?.id
  const isReviewer   = (ap) => ap.reviewerId  === session?.user?.id
  const canSelfReview = (ap) => isOwner(ap) && ap.status === 'draft'
  const canMgrReview  = (ap) => (isReviewer(ap) || isAdmin) && ap.status === 'submitted'
  const canFinalize   = (ap) => isAdmin && ap.status === 'reviewed'

  return (
    <ProtectedPage module="attendance">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
            {toast.msg}
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Performance Appraisals</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track goals, self-reviews and manager evaluations</p>
            </div>
            {isAdmin && (
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                <span className="text-lg">+</span> New Cycle
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Cards */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : appraisals.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">No appraisals yet</p>
              {isAdmin && <p className="text-sm text-slate-400 mt-1">Click "New Cycle" to create an appraisal period</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {appraisals.map(ap => {
                const sc = STATUS_CONFIG[ap.status] || STATUS_CONFIG.draft
                const goals = ap.goals ? (typeof ap.goals === 'string' ? JSON.parse(ap.goals) : ap.goals) : []
                return (
                  <div key={ap.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow p-5 space-y-4">
                    {/* Period & Status */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{ap.period}</p>
                        {(tab === 'team' || tab === 'all') && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">{ap.user?.name}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(ap.periodStart).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} – {new Date(ap.periodEnd).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${sc.color}`}>{sc.label}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Progress</span>
                        <span>{['Draft', 'Self done', 'Reviewed', 'Final'][sc.step]}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${sc.step === 3 ? 'bg-green-500' : sc.step === 2 ? 'bg-amber-500' : sc.step === 1 ? 'bg-blue-500' : 'bg-slate-300'}`} style={{ width: `${(sc.step / 3) * 100}%` }} />
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2.5">
                        <p className="text-slate-500 mb-1">Self Score</p>
                        <StarRating value={ap.selfScore} readonly />
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2.5">
                        <p className="text-slate-500 mb-1">Manager Score</p>
                        <StarRating value={ap.managerScore} readonly />
                      </div>
                    </div>

                    {/* Goals count */}
                    {goals.length > 0 && (
                      <p className="text-xs text-slate-500">{goals.filter(g => g.title).length} goal{goals.filter(g => g.title).length !== 1 ? 's' : ''} set</p>
                    )}

                    {/* Reviewer */}
                    {ap.reviewer && (
                      <p className="text-xs text-slate-500">Reviewer: <span className="font-medium text-slate-700 dark:text-slate-300">{ap.reviewer.name}</span></p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button onClick={() => openDetail(ap)} className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors">
                        {canSelfReview(ap) ? '✍️ Self Review' : canMgrReview(ap) ? '📝 Review' : '👁️ View'}
                      </button>
                      {canFinalize(ap) && (
                        <button onClick={() => handleFinalize(ap.id)} disabled={submitting} className="px-3 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
                          Finalize
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail / Review Modal */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selected.period}</h2>
                  {selected.user?.name && <p className="text-sm text-slate-500">{selected.user.name}</p>}
                </div>
                <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">✕</button>
              </div>

              <div className="p-6 space-y-6">
                {/* Self Review Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">Self Assessment</h3>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Overall Self Score</label>
                    <StarRating value={selfForm.selfScore} onChange={canSelfReview(selected) ? (v) => setSelfForm(f => ({ ...f, selfScore: v })) : null} readonly={!canSelfReview(selected)} />
                  </div>

                  {/* Goals */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Goals</label>
                      {canSelfReview(selected) && (
                        <button onClick={addGoal} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Goal</button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {selfForm.goals.map((goal, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 space-y-2">
                          <div className="flex gap-2">
                            <input value={goal.title} onChange={e => updateGoal(idx, 'title', e.target.value)} disabled={!canSelfReview(selected)} placeholder="Goal title" className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60" />
                            {canSelfReview(selected) && selfForm.goals.length > 1 && (
                              <button onClick={() => removeGoal(idx)} className="text-red-500 hover:text-red-700 text-xs px-1.5">✕</button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input value={goal.target} onChange={e => updateGoal(idx, 'target', e.target.value)} disabled={!canSelfReview(selected)} placeholder="Target" className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60" />
                            <input value={goal.achievement} onChange={e => updateGoal(idx, 'achievement', e.target.value)} disabled={!canSelfReview(selected)} placeholder="Achievement" className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60" />
                            <input value={goal.score} onChange={e => updateGoal(idx, 'score', e.target.value)} disabled={!canSelfReview(selected)} placeholder="Score 1-5" type="number" min="1" max="5" className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Self Comments</label>
                    <textarea rows={3} value={selfForm.selfComments} onChange={e => setSelfForm(f => ({ ...f, selfComments: e.target.value }))} disabled={!canSelfReview(selected)} placeholder="Describe your achievements and areas for improvement..." className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:opacity-60" />
                  </div>
                </div>

                {/* Manager Review Section */}
                {(canMgrReview(selected) || selected.managerScore || selected.managerComments) && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">Manager Evaluation</h3>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Manager Score</label>
                      <StarRating value={mgrForm.managerScore} onChange={canMgrReview(selected) ? (v) => setMgrForm(f => ({ ...f, managerScore: v })) : null} readonly={!canMgrReview(selected)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Manager Comments</label>
                      <textarea rows={3} value={mgrForm.managerComments} onChange={e => setMgrForm(f => ({ ...f, managerComments: e.target.value }))} disabled={!canMgrReview(selected)} placeholder="Provide your evaluation and feedback..." className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:opacity-60" />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setSelected(null)} className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Close</button>
                  {canSelfReview(selected) && (
                    <button onClick={handleSelfSubmit} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                      {submitting ? 'Submitting…' : 'Submit Self Review'}
                    </button>
                  )}
                  {canMgrReview(selected) && (
                    <button onClick={handleMgrReview} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                      {submitting ? 'Saving…' : 'Save Review'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Cycle Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Appraisal Cycle</h2>
                <button onClick={() => setShowCreate(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">✕</button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Period Name *</label>
                  <input required value={createForm.period} onChange={e => setCreateForm(f => ({ ...f, period: e.target.value }))} placeholder="e.g. Q1 2026 or Annual 2025" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
                    <input required type="date" value={createForm.periodStart} onChange={e => setCreateForm(f => ({ ...f, periodStart: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date *</label>
                    <input required type="date" value={createForm.periodEnd} onChange={e => setCreateForm(f => ({ ...f, periodEnd: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default Reviewer</label>
                  <select value={createForm.reviewerId} onChange={e => setCreateForm(f => ({ ...f, reviewerId: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">— Select Reviewer —</option>
                    {users.filter(u => ['admin', 'hr', 'manager'].includes(u.role)).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Employees *</label>
                  <div className="border border-slate-300 dark:border-slate-600 rounded-xl max-h-48 overflow-y-auto p-2 space-y-1">
                    {users.map(u => (
                      <label key={u.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                        <input type="checkbox" checked={createForm.userIds.includes(u.id)} onChange={e => {
                          setCreateForm(f => ({
                            ...f,
                            userIds: e.target.checked ? [...f.userIds, u.id] : f.userIds.filter(id => id !== u.id),
                          }))
                        }} className="rounded text-blue-600" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{u.name}</span>
                        <span className="text-xs text-slate-400 ml-auto">{u.department}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{createForm.userIds.length} selected</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting || !createForm.userIds.length} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                    {submitting ? 'Creating…' : `Create for ${createForm.userIds.length} employee${createForm.userIds.length !== 1 ? 's' : ''}`}
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
