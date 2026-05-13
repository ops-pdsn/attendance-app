'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'
import NotificationBell from '@/components/NotificationBell'
import { useToast } from '@/components/Toast'
import ProtectedPage from '@/components/ProtectedPage'

export const dynamic = 'force-dynamic'

const REPORT_TYPES = [
  { value: 'attendance', label: 'Attendance', icon: '📅', desc: 'Daily punch-in/out records' },
  { value: 'leave', label: 'Leave', icon: '🏖️', desc: 'Leave requests and approvals' },
  { value: 'task', label: 'Tasks', icon: '✅', desc: 'Task completion status' }
]

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [filters, setFilters] = useState({
    type: 'attendance',
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    department: '',
    userId: ''
  })
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)

  if (status === 'unauthenticated') { router.push('/login'); return null }
  if (status === 'loading') return null

  const buildUrl = (format = 'json') => {
    const p = new URLSearchParams({ type: filters.type, format })
    if (filters.start) p.set('start', filters.start)
    if (filters.end) p.set('end', filters.end)
    if (filters.department) p.set('department', filters.department)
    if (filters.userId) p.set('userId', filters.userId)
    return `/api/reports?${p.toString()}`
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch(buildUrl('json'))
      if (!res.ok) throw new Error((await res.json()).error)
      setReportData(await res.json())
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const handleDownload = () => {
    window.open(buildUrl('csv'), '_blank')
  }

  return (
    <ProtectedPage module="analytics">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Report Builder</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Generate custom reports with filters</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <DarkModeToggle />
              <UserNav />
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Report Type Selector */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Report Type</h2>
            <div className="grid grid-cols-3 gap-3">
              {REPORT_TYPES.map(rt => (
                <button key={rt.value} onClick={() => setFilters({ ...filters, type: rt.value })} className={`p-4 rounded-xl border-2 text-left transition-all ${filters.type === rt.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-transparent bg-slate-50 dark:bg-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600'}`}>
                  <p className="text-2xl mb-1">{rt.icon}</p>
                  <p className={`font-medium text-sm ${filters.type === rt.value ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{rt.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{rt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Filters</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Start Date</label>
                <input type="date" value={filters.start} onChange={e => setFilters({ ...filters, start: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">End Date</label>
                <input type="date" value={filters.end} onChange={e => setFilters({ ...filters, end: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Department</label>
                <input type="text" value={filters.department} onChange={e => setFilters({ ...filters, department: e.target.value })} placeholder="All departments" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Employee ID</label>
                <input type="text" value={filters.userId} onChange={e => setFilters({ ...filters, userId: e.target.value })} placeholder="All employees" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleGenerate} disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                Generate Report
              </button>
              {reportData && (
                <button onClick={handleDownload} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download CSV
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {reportData && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white capitalize">{reportData.type} Report</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{reportData.count} records found</p>
                </div>
              </div>
              {reportData.data.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-3xl mb-2">📊</p>
                  <p className="text-slate-500 dark:text-slate-400">No data for the selected period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-700/50">
                        {reportData.headers.map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {reportData.data.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          {reportData.headers.map(h => (
                            <td key={h} className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{row[h] ?? ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedPage>
  )
}
