'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UserNav from '@/components/UserNav'
import DarkModeToggle from '@/components/DarkModeToggle'
import { useToast } from '@/components/Toast'

export const dynamic = 'force-dynamic'

// ─── CSV Parser (client-side) ─────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return []

  // Detect delimiter
  const delim = lines[0].includes('\t') ? '\t' : ','

  const headers = lines[0].split(delim).map(h => h.trim().toLowerCase().replace(/[^a-z0-9 ]/g, ''))
  const rows    = []

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    const cells = line.split(delim).map(c => c.trim().replace(/^"|"$/g, ''))
    const row   = {}
    headers.forEach((h, i) => { row[h] = cells[i] || '' })
    rows.push(row)
  }

  // Detect format and normalise to { employeeId, date, punchIn, punchOut }
  const has = k => headers.some(h => h.includes(k))

  return rows.map(row => {
    // Employee ID — try multiple column names
    const employeeId =
      row['enroll no'] || row['enrollment no'] || row['user id'] || row['emp id'] ||
      row['employee id'] || row['id'] || row['no'] || ''

    // Date
    const date =
      row['date'] || row['attendance date'] || ''

    // In/Out columns (summary format)
    const punchIn  = row['in time'] || row['in']  || row['punch in']  || row['check in']  || ''
    const punchOut = row['out time'] || row['out'] || row['punch out'] || row['check out'] || ''

    // Punch time (raw log format — single column)
    const singlePunch = row['punch time'] || row['time'] || ''

    // Status
    const statusRaw = (row['status'] || row['verify'] || '').toLowerCase()
    const status = statusRaw.includes('out') ? 'out' : statusRaw.includes('in') ? 'in' : 'in'

    return {
      employeeId: employeeId.trim(),
      date:       date.trim(),
      punchIn:    (punchIn || (status === 'in' ? singlePunch : '')).trim(),
      punchOut:   (punchOut || (status === 'out' ? singlePunch : '')).trim(),
      _raw:       row,
    }
  }).filter(r => r.employeeId && r.date)
}

// ─── Relay script generator ───────────────────────────────────────────────────
function generateRelayScript(appUrl, machineIp, machinePort, machinePassword) {
  return `#!/usr/bin/env node
/**
 * ESSL / ZKTeco On-Premise Relay
 * Runs on a computer on the SAME local network as your biometric machine.
 * Polls the machine every 60 seconds and pushes data to your cloud app.
 *
 * Setup:
 *   npm install node-zklib node-fetch
 *   node essl-relay.js
 */

const ZKLib   = require('node-zklib')
const fetch   = require('node-fetch')

const MACHINE_IP       = '${machineIp || '192.168.1.201'}'
const MACHINE_PORT     = ${machinePort || 4370}
const MACHINE_PASSWORD = '${machinePassword || '0'}'
const APP_ADMS_URL     = '${appUrl}/api/essl/adms'
const POLL_INTERVAL_MS = 60_000   // 60 seconds

let lastSyncTime = 0

async function sync() {
  const zk = new ZKLib(MACHINE_IP, MACHINE_PORT, 5200, 5000)
  try {
    await zk.createSocket()
    const result = await zk.getAttendances()
    const logs   = result?.data || []

    // Filter only new records
    const newLogs = logs.filter(r => new Date(r.attendanceTime).getTime() > lastSyncTime)
    if (!newLogs.length) { console.log('[' + ts() + '] No new punches.'); return }

    // Format as ADMS body
    const lines = newLogs.map(r =>
      r.deviceUserId + '\\t' + fmtDate(r.attendanceTime) + '\\t' +
      (r.type === 0 ? '0' : '1') + '\\t1\\t0\\t0'
    )
    const body = 'SN=RELAY&table=ATTLOG&Stamp=0\\n' + lines.join('\\n')

    const res = await fetch(APP_ADMS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
    })

    if (res.ok) {
      lastSyncTime = Date.now()
      console.log('[' + ts() + '] Pushed ' + lines.length + ' punches → OK')
    } else {
      console.error('[' + ts() + '] Server error:', res.status)
    }
  } catch (err) {
    console.error('[' + ts() + '] Error:', err.message)
  } finally {
    try { await zk.disconnect() } catch {}
  }
}

function fmtDate(d) {
  return new Date(d).toISOString().replace('T', ' ').slice(0, 19)
}
function ts() {
  return new Date().toLocaleTimeString()
}

console.log('ESSL Relay started — polling every ' + (POLL_INTERVAL_MS/1000) + 's')
console.log('Machine : ' + MACHINE_IP + ':' + MACHINE_PORT)
console.log('App URL : ' + APP_ADMS_URL)
sync()
setInterval(sync, POLL_INTERVAL_MS)
`
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function EsslPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast  = useToast()

  const [activeTab, setActiveTab] = useState('csv')
  const [stats, setStats]         = useState({ machines: [], todayPunches: 0, unmatchedCount: 0 })
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(true)

  // CSV state
  const [csvText, setCsvText]           = useState('')
  const [csvRecords, setCsvRecords]     = useState([])
  const [importing, setImporting]       = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef(null)

  // ADMS machine form
  const [machineForm, setMachineForm] = useState({ serialNo: '', name: '', location: '', ipAddress: '', port: '4370', devicePassword: '0' })
  const [addingMachine, setAddingMachine] = useState(false)
  const [showMachineForm, setShowMachineForm] = useState(false)

  // Relay config
  const [relayConfig, setRelayConfig] = useState({ machineIp: '', machinePort: '4370', machinePassword: '0' })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated') {
      if (!['admin', 'hr'].includes(session.user.role)) { router.push('/'); return }
      fetchData()
    }
  }, [status])

  const fetchData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/essl/machines'),
        fetch('/api/essl/machines?type=logs'),
      ])
      if (statsRes.ok)  setStats(await statsRes.json())
      if (logsRes.ok)   setLogs(await logsRes.json())
    } catch {}
    setLoading(false)
  }

  // ─── CSV ──────────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      setCsvText(text)
      setCsvRecords(parseCSV(text))
      setImportResult(null)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!csvRecords.length) return
    setImporting(true)
    try {
      const res  = await fetch('/api/essl/csv-import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ records: csvRecords }),
      })
      const data = await res.json()
      if (res.ok) {
        setImportResult(data)
        toast.success(`Import complete: ${data.created} created, ${data.updated} updated`)
        fetchData()
      } else {
        toast.error(data.error || 'Import failed')
      }
    } catch {
      toast.error('Import failed')
    }
    setImporting(false)
  }

  // ─── Machine ──────────────────────────────────────────────────────────────
  const handleAddMachine = async (e) => {
    e.preventDefault()
    setAddingMachine(true)
    try {
      const res = await fetch('/api/essl/machines', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(machineForm),
      })
      if (res.ok) {
        toast.success('Machine registered!')
        setShowMachineForm(false)
        setMachineForm({ serialNo: '', name: '', location: '', ipAddress: '', port: '4370', devicePassword: '0' })
        fetchData()
      } else {
        const d = await res.json()
        toast.error(d.error || 'Failed to add machine')
      }
    } catch { toast.error('Failed to add machine') }
    setAddingMachine(false)
  }

  const handleDeleteMachine = async (id) => {
    if (!confirm('Remove this machine?')) return
    const res = await fetch(`/api/essl/machines?id=${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Machine removed'); fetchData() }
  }

  // ─── Relay script download ─────────────────────────────────────────────────
  const downloadRelay = () => {
    const appUrl = window.location.origin
    const script = generateRelayScript(appUrl, relayConfig.machineIp, relayConfig.machinePort, relayConfig.machinePassword)
    const blob   = new Blob([script], { type: 'text/javascript' })
    const a      = document.createElement('a')
    a.href       = URL.createObjectURL(blob)
    a.download   = 'essl-relay.js'
    a.click()
  }

  const admsUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/essl/adms` : '/api/essl/adms'

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const TABS = [
    { id: 'csv',    icon: '📂', label: 'CSV Import' },
    { id: 'adms',   icon: '📡', label: 'ADMS Live Sync' },
    { id: 'direct', icon: '🔌', label: 'Direct Connect' },
  ]

  const VERIFY_LABELS = { 0: 'Password', 1: 'Fingerprint', 2: 'Face', 3: 'Card', 4: 'Face+FP' }
  const PUNCH_LABELS  = { 0: 'IN', 1: 'OUT', 2: 'Break-Out', 3: 'Break-In', 4: 'OT-In', 5: 'OT-Out' }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">ESSL Biometric Integration</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Sync punch-in/out data from ESSL / ZKTeco biometric machines</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <UserNav />
          </div>
        </div>

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Machines', value: stats.machines?.length || 0, icon: '🖥️', color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Punches Today', value: stats.todayPunches || 0, icon: '👆', color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Unmatched', value: stats.unmatchedCount || 0, icon: '⚠️', color: stats.unmatchedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/50 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{s.icon}</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* ════ CSV IMPORT ════ */}
            {activeTab === 'csv' && (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-semibold mb-1">📋 How it works</p>
                  <p>Export attendance logs from your <strong>ESSL eTimeTracklite</strong> or <strong>eSSL Software</strong> → Upload the CSV here → Preview → Import. Works with all ESSL models.</p>
                </div>

                {/* Supported formats */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Supported CSV Formats</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { title: 'Punch Log Report', cols: 'Enroll No, Name, Date, Punch Time, Status', badge: 'Auto-detected' },
                      { title: 'In/Out Summary',   cols: 'Emp ID, Name, Date, In Time, Out Time',   badge: 'Auto-detected' },
                      { title: 'Raw ATT Log',       cols: 'User ID, Date, Time (tab-separated)',     badge: 'Auto-detected' },
                    ].map(f => (
                      <div key={f.title} className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600/50">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{f.title}</p>
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">{f.badge}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{f.cols}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upload area */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Upload CSV File</p>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group"
                  >
                    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors">
                      <svg className="w-7 h-7 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">Click to upload CSV</p>
                    <p className="text-xs text-slate-400 mt-1">or drag and drop — .csv, .txt supported</p>
                  </div>
                  <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" onChange={handleFileChange} className="hidden" />
                </div>

                {/* Preview table */}
                {csvRecords.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Preview — {csvRecords.length} records detected
                      </p>
                      <button
                        onClick={() => { setCsvText(''); setCsvRecords([]); setImportResult(null) }}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto max-h-60">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                            <tr>
                              {['Employee ID', 'Date', 'Punch In', 'Punch Out'].map(h => (
                                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {csvRecords.slice(0, 50).map((r, i) => (
                              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="px-3 py-2 font-mono font-bold text-slate-700 dark:text-slate-300">{r.employeeId}</td>
                                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{r.date}</td>
                                <td className="px-3 py-2 text-emerald-600 dark:text-emerald-400">{r.punchIn || '—'}</td>
                                <td className="px-3 py-2 text-red-500 dark:text-red-400">{r.punchOut || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {csvRecords.length > 50 && (
                          <p className="text-center text-xs text-slate-400 py-2">…and {csvRecords.length - 50} more rows</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className="mt-4 w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                    >
                      {importing ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Importing…</>
                      ) : (
                        <>Import {csvRecords.length} Records into Attendance</>
                      )}
                    </button>
                  </div>
                )}

                {/* Import result */}
                {importResult && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Created',   value: importResult.created,  color: 'text-emerald-600' },
                      { label: 'Updated',   value: importResult.updated,  color: 'text-blue-600' },
                      { label: 'Skipped',   value: importResult.skipped,  color: 'text-slate-500' },
                      { label: 'Unmatched', value: importResult.unmapped?.length || 0, color: 'text-amber-600' },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 text-center">
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                    {importResult.unmapped?.length > 0 && (
                      <div className="col-span-full p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Unmatched Employee IDs — set Employee ID in Admin → Users profile:</p>
                        <p className="text-xs text-amber-600 dark:text-amber-500 font-mono">{importResult.unmapped.join(', ')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ════ ADMS LIVE SYNC ════ */}
            {activeTab === 'adms' && (
              <div className="space-y-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-xl p-4 text-sm text-emerald-800 dark:text-emerald-300">
                  <p className="font-semibold mb-1">📡 How ADMS works</p>
                  <p>Configure your ESSL machine with the URL below. Every time someone punches in/out, the machine automatically pushes the data to your app in real-time — no manual export needed.</p>
                </div>

                {/* Endpoint URL */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your ADMS Endpoint URL</p>
                  <div className="flex items-center gap-2 p-3 bg-slate-900 dark:bg-slate-950 rounded-xl">
                    <code className="flex-1 text-emerald-400 text-sm font-mono truncate">{admsUrl}</code>
                    <button
                      onClick={() => copyToClipboard(admsUrl, 'URL')}
                      className="flex-shrink-0 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg font-medium transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Configuration guide */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Machine Configuration Steps</p>
                  <div className="space-y-3">
                    {[
                      { step: '1', title: 'Open machine menu', desc: 'On your ESSL machine, go to Menu → Communication → Cloud Server Settings (or ADMS Settings)' },
                      { step: '2', title: 'Set server address', desc: `Enter the server domain from your URL above (without /api/essl/adms). Port: 80 or 443 (HTTPS).` },
                      { step: '3', title: 'Set the path', desc: `Set the push path to: /api/essl/adms` },
                      { step: '4', title: 'Enable HTTPS push', desc: 'If your app is on HTTPS (recommended for production), enable HTTPS in the machine settings.' },
                      { step: '5', title: 'Set push interval', desc: 'Recommended: 60 seconds. The machine will push attendance data every minute.' },
                      { step: '6', title: 'Save & restart', desc: 'Save settings and restart the machine. You should see it appear in the Machine List below within a minute.' },
                    ].map(s => (
                      <div key={s.step} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                        <div className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{s.step}</div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Machine list */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Registered Machines</p>
                    <button
                      onClick={() => setShowMachineForm(!showMachineForm)}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg font-semibold transition-colors"
                    >
                      + Add Machine
                    </button>
                  </div>

                  {showMachineForm && (
                    <form onSubmit={handleAddMachine} className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl space-y-3 border border-slate-200 dark:border-slate-600/50">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Register Machine</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {[
                          { key: 'serialNo', label: 'Serial No *', placeholder: 'e.g. CTMS2D213960', required: true },
                          { key: 'name',     label: 'Name',         placeholder: 'e.g. Main Entrance' },
                          { key: 'location', label: 'Location',     placeholder: 'e.g. Ground Floor' },
                          { key: 'ipAddress',label: 'IP Address',   placeholder: '192.168.1.201' },
                        ].map(f => (
                          <div key={f.key}>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                            <input
                              type="text"
                              required={f.required}
                              placeholder={f.placeholder}
                              value={machineForm[f.key]}
                              onChange={e => setMachineForm(p => ({ ...p, [f.key]: e.target.value }))}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={addingMachine} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg font-semibold disabled:opacity-50">
                          {addingMachine ? 'Saving…' : 'Save'}
                        </button>
                        <button type="button" onClick={() => setShowMachineForm(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-lg">Cancel</button>
                      </div>
                    </form>
                  )}

                  {stats.machines?.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">No machines registered yet — they appear automatically when they connect via ADMS</div>
                  ) : (
                    <div className="space-y-2">
                      {stats.machines?.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700/50">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${m.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{m.name || m.serialNo}</p>
                            <p className="text-xs text-slate-400 truncate">
                              SN: {m.serialNo} {m.location ? `· ${m.location}` : ''} · {m._count?.logs || 0} total punches
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-slate-400">Last sync</p>
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                              {m.lastSyncAt ? new Date(m.lastSyncAt).toLocaleTimeString() : 'Never'}
                            </p>
                          </div>
                          <button onClick={() => handleDeleteMachine(m.id)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent punch log */}
                {logs.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Punch Log</p>
                      <button onClick={fetchData} className="text-xs text-blue-500 hover:text-blue-600">Refresh</button>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto max-h-64">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                            <tr>
                              {['Employee ID', 'Time', 'Type', 'Verify', 'Source', 'Status'].map(h => (
                                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {logs.map(log => (
                              <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="px-3 py-2 font-mono font-bold text-slate-700 dark:text-slate-300">{log.employeeId}</td>
                                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{new Date(log.punchTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${log.punchType === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                    {PUNCH_LABELS[log.punchType] || log.punchType}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-500">{VERIFY_LABELS[log.verifyMode] || '—'}</td>
                                <td className="px-3 py-2 uppercase text-[10px] text-slate-400 font-bold">{log.source}</td>
                                <td className="px-3 py-2">
                                  {log.processed
                                    ? <span className="text-emerald-500 font-bold">✓ Matched</span>
                                    : <span className="text-amber-500">⚠ Unmatched</span>
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {stats.unmatchedCount > 0 && (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        ⚠ {stats.unmatchedCount} punches unmatched — go to Admin → Users and set the Employee ID field to match machine IDs.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ════ DIRECT CONNECT (ZKTeco SDK Relay) ════ */}
            {activeTab === 'direct' && (
              <div className="space-y-6">
                {/* Architecture note */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">🏢 On-Premise Relay Required</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    ESSL machines communicate over your <strong>local network (LAN)</strong> using ZKTeco SDK protocol on port 4370.
                    Since this app is hosted in the cloud, direct access isn't possible.
                    The relay script below runs on any computer on the same network as the machine and bridges the gap.
                  </p>
                </div>

                {/* Architecture diagram */}
                <div className="bg-slate-900 rounded-xl p-4 text-xs font-mono text-slate-300 space-y-1">
                  <p className="text-slate-500">// Architecture</p>
                  <p><span className="text-emerald-400">ESSL Machine</span> (LAN port 4370)</p>
                  <p className="pl-4 text-slate-500">↕ ZKTeco SDK protocol</p>
                  <p><span className="text-blue-400">essl-relay.js</span> (runs on your local PC/server)</p>
                  <p className="pl-4 text-slate-500">↕ HTTPS POST</p>
                  <p><span className="text-violet-400">Your App</span> /api/essl/adms (cloud)</p>
                  <p className="pl-4 text-slate-500">↕</p>
                  <p><span className="text-orange-400">Attendance Database</span></p>
                </div>

                {/* Relay config */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Configure & Download Relay Script</p>
                  <div className="grid sm:grid-cols-3 gap-3 mb-4">
                    {[
                      { key: 'machineIp',       label: 'Machine IP',     placeholder: '192.168.1.201' },
                      { key: 'machinePort',     label: 'Port',           placeholder: '4370' },
                      { key: 'machinePassword', label: 'Device Password', placeholder: '0 (default)' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                        <input
                          type="text"
                          placeholder={f.placeholder}
                          value={relayConfig[f.key]}
                          onChange={e => setRelayConfig(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={downloadRelay}
                    className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download essl-relay.js
                  </button>
                </div>

                {/* Setup steps */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Setup Instructions</p>
                  <div className="space-y-3">
                    {[
                      {
                        step: '1', title: 'Install Node.js',
                        code: null,
                        desc: 'Install Node.js 18+ on a Windows/Linux PC on the same network as your ESSL machine.',
                      },
                      {
                        step: '2', title: 'Install dependencies',
                        code: 'npm install node-zklib node-fetch',
                        desc: 'Run this in the same folder as the downloaded relay script.',
                      },
                      {
                        step: '3', title: 'Run the relay',
                        code: 'node essl-relay.js',
                        desc: 'The relay will connect to the machine every 60 seconds and push punch data to your app.',
                      },
                      {
                        step: '4', title: 'Run as a service (optional)',
                        code: 'npm install -g pm2\npm2 start essl-relay.js --name essl-relay\npm2 startup',
                        desc: 'Use PM2 to keep the relay running in the background and auto-start on reboot.',
                      },
                    ].map(s => (
                      <div key={s.step} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 bg-violet-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{s.step}</div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{s.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{s.desc}</p>
                            {s.code && (
                              <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2">
                                <code className="text-emerald-400 text-xs font-mono flex-1">{s.code}</code>
                                <button onClick={() => copyToClipboard(s.code, 'Command')} className="text-slate-500 hover:text-slate-300 transition-colors text-[10px]">Copy</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compatibility */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Compatible Devices</p>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                    {[
                      'ESSL x990 / x100 / x200 series',
                      'ESSL MB10 / MB20 / MB160',
                      'ESSL Face Pro / Face Ultra',
                      'ZKTeco K40 / K80 / L80',
                      'ZKTeco F22 / F18 / F19',
                      'Any ZKTeco-compatible device (port 4370)',
                    ].map(d => (
                      <div key={d} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                        <span className="text-emerald-500 font-bold">✓</span>
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
