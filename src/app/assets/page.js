'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ProtectedPage from '@/components/ProtectedPage'

const CATEGORIES = [
  { value: 'laptop',    label: 'Laptop',    icon: '💻' },
  { value: 'phone',     label: 'Phone',     icon: '📱' },
  { value: 'vehicle',   label: 'Vehicle',   icon: '🚗' },
  { value: 'furniture', label: 'Furniture', icon: '🪑' },
  { value: 'equipment', label: 'Equipment', icon: '🔧' },
  { value: 'other',     label: 'Other',     icon: '📦' },
]

const STATUS_CONFIG = {
  available:   { label: 'Available',   color: 'bg-green-100  text-green-700  dark:bg-green-500/20  dark:text-green-400'  },
  assigned:    { label: 'Assigned',    color: 'bg-blue-100   text-blue-700   dark:bg-blue-500/20   dark:text-blue-400'   },
  maintenance: { label: 'Maintenance', color: 'bg-amber-100  text-amber-700  dark:bg-amber-500/20  dark:text-amber-400'  },
  retired:     { label: 'Retired',     color: 'bg-slate-100  text-slate-600  dark:bg-slate-700     dark:text-slate-400'  },
}

const CONDITION_CONFIG = {
  good: { label: 'Good', color: 'text-green-600 dark:text-green-400' },
  fair: { label: 'Fair', color: 'text-amber-600 dark:text-amber-400' },
  poor: { label: 'Poor', color: 'text-red-600   dark:text-red-400'   },
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

export default function AssetsPage() {
  const { data: session } = useSession()
  const [assets, setAssets]       = useState([])
  const [stats, setStats]         = useState([])
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('all')
  const [showForm, setShowForm]   = useState(false)
  const [assignModal, setAssignModal] = useState(null)
  const [selectedUser, setSelectedUser] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]         = useState(null)
  const [search, setSearch]       = useState('')

  const isAdmin = ['admin', 'hr'].includes(session?.user?.role)

  const [form, setForm] = useState({
    name: '', assetCode: '', category: 'laptop', brand: '', model: '',
    serialNo: '', purchaseDate: '', purchasePrice: '', condition: 'good', notes: '',
  })

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const view = isAdmin ? (tab === 'mine' ? 'mine' : 'all') : 'mine'
      const res  = await fetch(`/api/assets?view=${view}`)
      const data = await res.json()
      setAssets(data.assets || [])
      setStats(data.stats  || [])
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    const res  = await fetch('/api/users?active=true')
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : data.users || [])
  }

  useEffect(() => { if (session) { load(); if (isAdmin) loadUsers() } }, [session, tab])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Asset added!')
      setShowForm(false)
      setForm({ name: '', assetCode: '', category: 'laptop', brand: '', model: '', serialNo: '', purchaseDate: '', purchasePrice: '', condition: 'good', notes: '' })
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssign = async () => {
    if (!assignModal || !selectedUser) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/assets/${assignModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', userId: selectedUser }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Asset assigned!')
      setAssignModal(null)
      setSelectedUser('')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAction = async (id, action) => {
    const label = action === 'unassign' ? 'unassign' : action === 'maintenance' ? 'send to maintenance' : 'retire'
    if (!confirm(`Are you sure you want to ${label} this asset?`)) return
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast(`Asset ${label}d!`)
      load()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this asset permanently?')) return
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Asset deleted!')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const statMap = {}
  stats.forEach(s => { statMap[s.status] = s._count._all })
  const filtered = assets.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.assetCode.toLowerCase().includes(search.toLowerCase()) ||
    a.brand?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <ProtectedPage module="admin">
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
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Asset Management</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track and manage company assets</p>
            </div>
            {isAdmin && (
              <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                <span className="text-lg">+</span> Add Asset
              </button>
            )}
          </div>

          {/* Stats */}
          {isAdmin && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'available',   icon: '✅', label: 'Available',   color: 'border-green-400'  },
                { key: 'assigned',    icon: '👤', label: 'Assigned',    color: 'border-blue-400'   },
                { key: 'maintenance', icon: '🔧', label: 'Maintenance', color: 'border-amber-400'  },
                { key: 'retired',     icon: '🗄️', label: 'Retired',    color: 'border-slate-400'  },
              ].map(s => (
                <div key={s.key} className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border-l-4 ${s.color} shadow-sm`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</span>
                    <span className="text-xl">{s.icon}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{statMap[s.key] || 0}</p>
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, code, brand…" className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            {isAdmin && (
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {[{ key: 'all', label: 'All Assets' }, { key: 'mine', label: 'My Assets' }].map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assets Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">💼</div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">No assets found</p>
                {isAdmin && <p className="text-sm text-slate-400 mt-1">Click "Add Asset" to register a new asset</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      {['Asset', 'Code', 'Category', 'Condition', 'Status', 'Assigned To', 'Since', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filtered.map(asset => {
                      const cat  = CATEGORIES.find(c => c.value === asset.category)
                      const sc   = STATUS_CONFIG[asset.status] || STATUS_CONFIG.available
                      const cond = CONDITION_CONFIG[asset.condition] || CONDITION_CONFIG.good
                      return (
                        <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 dark:text-white">{asset.name}</p>
                            {(asset.brand || asset.model) && (
                              <p className="text-xs text-slate-500">{[asset.brand, asset.model].filter(Boolean).join(' ')}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{asset.assetCode}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg font-medium">
                              {cat?.icon} {cat?.label || asset.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${cond.color}`}>{cond.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${sc.color}`}>{sc.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            {asset.assignee ? (
                              <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">{asset.assignee.name}</p>
                                <p className="text-xs text-slate-500">{asset.assignee.department}</p>
                              </div>
                            ) : <span className="text-xs text-slate-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(asset.assignedAt)}</td>
                          <td className="px-4 py-3">
                            {isAdmin && (
                              <div className="flex items-center gap-1">
                                {asset.status === 'available' && (
                                  <button onClick={() => setAssignModal(asset)} className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-400 rounded-lg">Assign</button>
                                )}
                                {asset.status === 'assigned' && (
                                  <button onClick={() => handleAction(asset.id, 'unassign')} className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-400 rounded-lg">Unassign</button>
                                )}
                                {!['maintenance', 'retired'].includes(asset.status) && (
                                  <button onClick={() => handleAction(asset.id, 'maintenance')} className="px-2 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 rounded-lg">Maint.</button>
                                )}
                                {asset.status !== 'retired' && (
                                  <button onClick={() => handleAction(asset.id, 'retire')} className="px-2 py-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 rounded-lg">Retire</button>
                                )}
                                {asset.status !== 'assigned' && (
                                  <button onClick={() => handleDelete(asset.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">🗑️</button>
                                )}
                              </div>
                            )}
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

        {/* Add Asset Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add New Asset</h2>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">✕</button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dell Latitude 5540" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asset Code *</label>
                    <input required value={form.assetCode} onChange={e => setForm(f => ({ ...f, assetCode: e.target.value }))} placeholder="LAP-001" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                    <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Condition</label>
                    <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Brand</label>
                    <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Dell" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Model</label>
                    <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Latitude 5540" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Serial No.</label>
                    <input value={form.serialNo} onChange={e => setForm(f => ({ ...f, serialNo: e.target.value }))} placeholder="SN123456" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Purchase Price (₹)</label>
                    <input type="number" value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))} placeholder="0" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Purchase Date</label>
                  <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                    {submitting ? 'Saving…' : 'Add Asset'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Modal */}
        {assignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assign Asset</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400"><strong>{assignModal.name}</strong> ({assignModal.assetCode})</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Employee</label>
                <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">— Select Employee —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} {u.employeeId ? `(${u.employeeId})` : ''}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setAssignModal(null); setSelectedUser('') }} className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                <button onClick={handleAssign} disabled={!selectedUser || submitting} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                  {submitting ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  )
}
