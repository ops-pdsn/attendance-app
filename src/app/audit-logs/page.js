'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'
import NotificationBell from '@/components/NotificationBell'
import { useToast } from '@/components/Toast'
import ProtectedPage from '@/components/ProtectedPage'

export const dynamic = 'force-dynamic'

const ACTION_COLORS = {
  create: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
  update: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  delete: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
  approve: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  reject: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400',
  login: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400'
}

export default function AuditLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [logs, setLogs] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  const [filters, setFilters] = useState({
    module: '',
    action: '',
    userId: '',
    page: 1
  })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated') fetchLogs()
  }, [status, filters])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: filters.page, limit: 25 })
      if (filters.module) p.set('module', filters.module)
      if (filters.action) p.set('action', filters.action)
      if (filters.userId) p.set('userId', filters.userId)
      const res = await fetch(`/api/audit-logs?${p.toString()}`)
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      setLogs(data.logs || [])
      setMeta({ total: data.total, page: data.page, pages: data.pages })
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  if (status === 'loading') return null

  return (
    <ProtectedPage module="admin">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Audit Logs</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">System activity trail</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <DarkModeToggle />
              <UserNav />
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Module</label>
                <select value={filters.module} onChange={e => setFilters({ ...filters, module: e.target.value, page: 1 })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm">
                  <option value="">All Modules</option>
                  <option value="attendance">Attendance</option>
                  <option value="leave">Leave</option>
                  <option value="user">User</option>
                  <option value="payroll">Payroll</option>
                  <option value="task">Task</option>
                  <option value="shift">Shift</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Action</label>
                <select value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value, page: 1 })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm">
                  <option value="">All Actions</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="approve">Approve</option>
                  <option value="reject">Reject</option>
                  <option value="login">Login</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Search User ID</label>
                <input type="text" value={filters.userId} onChange={e => setFilters({ ...filters, userId: e.target.value, page: 1 })} placeholder="Filter by user ID..." className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
              </div>
            </div>
          </div>

          {/* Stats */}
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{meta.total} total logs — showing page {meta.page} of {meta.pages}</p>

          {/* Logs Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <p className="text-4xl mb-2">🔍</p>
              <p className="text-slate-500">No logs found</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {logs.map(log => (
                  <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ACTION_COLORS[log.action] || 'bg-slate-100 dark:bg-slate-700 text-slate-600'}`}>{log.action}</span>
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full capitalize">{log.module}</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300 font-medium flex-1">{log.description}</span>
                      <div className="text-right shrink-0">
                        {log.user && <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{log.user.name}</p>}
                        <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    {expandedId === log.id && log.metadata && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-medium text-slate-500 mb-1">Details</p>
                        <pre className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-lg p-3 overflow-auto max-h-40">{JSON.stringify(JSON.parse(log.metadata), null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {meta.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button onClick={() => setFilters(f => ({ ...f, page: Math.max(1, f.page - 1) }))} disabled={filters.page <= 1} className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700">Previous</button>
              <span className="text-sm text-slate-500">Page {meta.page} of {meta.pages}</span>
              <button onClick={() => setFilters(f => ({ ...f, page: Math.min(meta.pages, f.page + 1) }))} disabled={filters.page >= meta.pages} className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700">Next</button>
            </div>
          )}
        </div>
      </div>
    </ProtectedPage>
  )
}
