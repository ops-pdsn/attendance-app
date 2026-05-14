'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import LocationPicker from './LocationPicker'
import { useToast } from './Toast'

function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fmtTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtTimeDisplay(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_CONFIG = {
  office:  { icon: '🏢', label: 'Office',    gradient: 'from-blue-500 to-blue-600',    ring: 'ring-blue-400',    light: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' },
  field:   { icon: '🚗', label: 'Field Work', gradient: 'from-emerald-500 to-teal-500', ring: 'ring-emerald-400', light: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300' },
  weekoff: { icon: '🏖️', label: 'Week Off',  gradient: 'from-violet-500 to-purple-600', ring: 'ring-violet-400', light: 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-300' },
  holiday: { icon: '🎉', label: 'Holiday',   gradient: 'from-orange-500 to-amber-500',  ring: 'ring-orange-400', light: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300' },
}

const SESSIONS = [
  { value: 'full_day',  label: 'Full Day' },
  { value: 'morning',   label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
]

export default function AttendanceModal({ date, existingAttendance, allDayAttendance, onClose, onSuccess }) {
  const toast = useToast()

  const [mode, setMode] = useState(existingAttendance ? 'view' : 'choice')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    status:   existingAttendance?.status  || 'office',
    session:  existingAttendance?.session || 'full_day',
    notes:    existingAttendance?.notes   || '',
    punchIn:  fmtTime(existingAttendance?.punchIn),
    punchOut: fmtTime(existingAttendance?.punchOut),
  })
  const [locationData, setLocationData]   = useState(null)
  const [capturedPhoto, setCapturedPhoto] = useState(existingAttendance?.photo || null)
  const [showCamera, setShowCamera]       = useState(false)
  const [cameraStream, setCameraStream]   = useState(null)
  const [countdown, setCountdown]         = useState(null)
  const [editingRecord, setEditingRecord] = useState(existingAttendance || null)
  const [cameraFacing, setCameraFacing]   = useState('user')

  const videoRef     = useRef(null)
  const canvasRef    = useRef(null)
  const countdownRef = useRef(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop())
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [cameraStream])

  useEffect(() => {
    if (showCamera && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
    }
  }, [showCamera, cameraStream])

  // ─── Camera ───────────────────────────────────────────────────────────────

  const startCamera = async (facing = 'user') => {
    try {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      setCameraStream(stream)
      setCameraFacing(facing)
      setShowCamera(true)
    } catch {
      toast.error('Camera access denied — please allow camera permission in your browser.')
    }
  }

  const flipCamera = () => startCamera(cameraFacing === 'user' ? 'environment' : 'user')

  const stopCamera = () => {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop())
    setCameraStream(null)
    setShowCamera(false)
    setCountdown(null)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }

  const captureNow = () => {
    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return

    // High-quality capture
    canvas.width  = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')

    // Mirror only for front camera so stored photo isn't reversed
    if (cameraFacing === 'user') {
      ctx.translate(640, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, 640, 480)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
    } else {
      ctx.drawImage(video, 0, 0, 640, 480)
    }

    // ── Timestamp overlay ──────────────────────────────────────────────────
    const now      = new Date()
    const dateTxt  = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const timeTxt  = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    const status   = STATUS_CONFIG[formData.status]?.label || 'Attendance'

    // Dark gradient bar at bottom
    const grad = ctx.createLinearGradient(0, 430, 0, 480)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,0.80)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 430, 640, 50)

    // Date & time
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px "Courier New", monospace'
    ctx.fillText(`${dateTxt}  ·  ${timeTxt}`, 12, 468)

    // Status badge (right side)
    ctx.font = 'bold 12px sans-serif'
    ctx.fillStyle = '#93c5fd'
    ctx.textAlign = 'right'
    ctx.fillText(status, 628, 468)
    ctx.textAlign = 'left'

    // App watermark top-left
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.font = '11px sans-serif'
    ctx.fillText('Attendance Monitor', 10, 18)

    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.88))
    stopCamera()
  }

  const startCountdown = () => {
    if (countdown !== null) return
    setCountdown(3)
    let c = 3
    countdownRef.current = setInterval(() => {
      c -= 1
      if (c <= 0) {
        clearInterval(countdownRef.current)
        setCountdown(null)
        captureNow()
      } else {
        setCountdown(c)
      }
    }, 1000)
  }

  // ─── Location ─────────────────────────────────────────────────────────────

  const handleLocationSelect = useCallback((data) => setLocationData(data), [])

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Require photo for field attendance
    if (formData.status === 'field' && !capturedPhoto) {
      toast.warning('Please take a selfie photo for field attendance.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        date:    localDateStr(date),
        status:  formData.status,
        session: formData.session,
        notes:   formData.notes,
      }

      if (locationData) {
        payload.latitude  = locationData.latitude
        payload.longitude = locationData.longitude
        payload.location  = locationData.address || `${locationData.latitude}, ${locationData.longitude}`
        payload.accuracy  = locationData.accuracy
      }

      if (capturedPhoto) payload.photo = capturedPhoto

      if (formData.punchIn) {
        const [h, m] = formData.punchIn.split(':')
        const dt = new Date(date)
        dt.setHours(+h, +m, 0, 0)
        payload.punchIn = dt.toISOString()
      }
      if (formData.punchOut) {
        const [h, m] = formData.punchOut.split(':')
        const dt = new Date(date)
        dt.setHours(+h, +m, 0, 0)
        payload.punchOut = dt.toISOString()
      }

      const res  = await fetch('/api/attendance', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()

      if (res.ok) {
        toast.success(editingRecord ? 'Attendance updated!' : 'Attendance marked successfully!')
        onSuccess?.()
        onClose()
      } else {
        toast.error(data.error || 'Failed to save attendance')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fmtDate = date.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const photoRequired = formData.status === 'field'

  // ─── Enter edit mode ──────────────────────────────────────────────────────
  const enterEdit = (record) => {
    setEditingRecord(record)
    setFormData({
      status:   record.status,
      session:  record.session,
      notes:    record.notes || '',
      punchIn:  fmtTime(record.punchIn),
      punchOut: fmtTime(record.punchOut),
    })
    setCapturedPhoto(record.photo || null)
    setMode('form')
  }

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-t-[28px] sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[94vh] flex flex-col border-0 sm:border border-slate-200 dark:border-slate-700">

        {/* ── Header ── */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight">
              {mode === 'view'   ? 'Attendance Details'
               : mode === 'choice' ? 'Log Attendance'
               : editingRecord   ? 'Edit Attendance'
               : 'Mark Attendance'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{fmtDate}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ════ VIEW MODE ════ */}
          {mode === 'view' && editingRecord && (() => {
            const cfg  = STATUS_CONFIG[editingRecord.status] || STATUS_CONFIG.office
            const pIn  = editingRecord.punchIn  ? new Date(editingRecord.punchIn)  : null
            const pOut = editingRecord.punchOut ? new Date(editingRecord.punchOut) : null
            const hrs  = pIn && pOut ? ((pOut - pIn) / 3_600_000).toFixed(1) : null
            return (
              <div className="space-y-4">
                {/* Status card */}
                <div className={`rounded-2xl border p-4 ${cfg.light}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/50 dark:bg-black/20 rounded-xl flex items-center justify-center text-2xl">
                      {cfg.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-base">{cfg.label}</p>
                      <p className="text-xs opacity-75 capitalize mt-0.5">{editingRecord.session?.replace('_', ' ')}</p>
                    </div>
                    {hrs && (
                      <div className="text-right">
                        <p className="text-2xl font-black">{hrs}h</p>
                        <p className="text-[10px] opacity-60 uppercase tracking-wide">worked</p>
                      </div>
                    )}
                  </div>

                  {(pIn || pOut) && (
                    <div className="flex gap-6 mt-4 pt-3 border-t border-current/10">
                      <div>
                        <p className="text-[10px] opacity-60 uppercase tracking-wide mb-0.5">Punch In</p>
                        <p className="font-semibold text-sm">{fmtTimeDisplay(editingRecord.punchIn)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] opacity-60 uppercase tracking-wide mb-0.5">Punch Out</p>
                        <p className="font-semibold text-sm">{fmtTimeDisplay(editingRecord.punchOut)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Photo */}
                {editingRecord.photo && (
                  <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                    <img src={editingRecord.photo} alt="Attendance photo" className="w-full object-cover max-h-52" />
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-700/50">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-xs text-slate-400">Attendance selfie</p>
                    </div>
                  </div>
                )}

                {/* Location */}
                {editingRecord.location && (
                  <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                    <span className="text-base mt-0.5">📍</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{editingRecord.location}</p>
                  </div>
                )}

                {/* Notes */}
                {editingRecord.notes && (
                  <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                    <span className="text-base mt-0.5">📝</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{editingRecord.notes}</p>
                  </div>
                )}

                {/* Multiple sessions */}
                {allDayAttendance?.length > 1 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">All Sessions</p>
                    {allDayAttendance.map(a => (
                      <button
                        key={a.id}
                        onClick={() => setEditingRecord(a)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${a.id === editingRecord.id ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}
                      >
                        <span className="text-lg">{STATUS_CONFIG[a.status]?.icon}</span>
                        <span className="capitalize text-slate-700 dark:text-slate-300 font-medium">{a.session?.replace('_', ' ')}</span>
                        {a.photo && <span className="text-xs text-emerald-500 ml-1">📸</span>}
                        <span className="ml-auto text-slate-400 text-xs">{fmtTimeDisplay(a.punchIn)}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm">
                    Close
                  </button>
                  <button onClick={() => enterEdit(editingRecord)} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-sm transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            )
          })()}

          {/* ════ CHOICE MODE ════ */}
          {mode === 'choice' && (
            <div className="space-y-3">
              <div className="text-center pt-4 pb-2">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <span className="text-3xl">📅</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">No attendance logged for this date</p>
              </div>

              <button
                onClick={() => setMode('form')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-xl flex-shrink-0">📋</div>
                <div className="text-left">
                  <p className="font-bold">Log Attendance</p>
                  <p className="text-xs opacity-80 mt-0.5">Photo · Location · Punch times</p>
                </div>
                <svg className="w-5 h-5 opacity-60 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button onClick={onClose} className="w-full py-3 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                Cancel
              </button>
            </div>
          )}

          {/* ════ FORM MODE ════ */}
          {mode === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Work Type */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Work Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_CONFIG).map(([val, cfg]) => {
                    const active = formData.status === val
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, status: val }))}
                        className={`relative flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                          active
                            ? `bg-gradient-to-br ${cfg.gradient} border-transparent text-white shadow-md`
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span className="text-xl leading-none">{cfg.icon}</span>
                        <span>{cfg.label}</span>
                        {active && (
                          <svg className="w-4 h-4 ml-auto opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Session */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Session</p>
                <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
                  {SESSIONS.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, session: s.value }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                        formData.session === s.value
                          ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Punch Times */}
              {(formData.status === 'office' || formData.status === 'field') && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Punch Times</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Punch In</span>
                      </div>
                      <input
                        type="time"
                        value={formData.punchIn}
                        onChange={e => setFormData(f => ({ ...f, punchIn: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Punch Out</span>
                      </div>
                      <input
                        type="time"
                        value={formData.punchOut}
                        onChange={e => setFormData(f => ({ ...f, punchOut: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Photo Capture — All types ─────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Selfie Photo</p>
                  {photoRequired
                    ? <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-2 py-0.5 rounded-full">Required</span>
                    : <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Optional</span>
                  }
                </div>

                {/* Camera active */}
                {showCamera && (
                  <div className="space-y-2">
                    <div className="relative rounded-2xl overflow-hidden bg-black shadow-xl" style={{ aspectRatio: '4/3' }}>
                      {/* Mirrored preview for selfie feel */}
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none' }}
                      />

                      {/* Face guide oval */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-36 h-44 border-2 border-white/50 rounded-full shadow-inner" />
                      </div>

                      {/* Corner brackets */}
                      {[['top-2 left-2', 'border-t-2 border-l-2 rounded-tl'], ['top-2 right-2', 'border-t-2 border-r-2 rounded-tr'], ['bottom-10 left-2', 'border-b-2 border-l-2 rounded-bl'], ['bottom-10 right-2', 'border-b-2 border-r-2 rounded-br']].map(([pos, border]) => (
                        <div key={pos} className={`absolute ${pos} w-5 h-5 ${border} border-white/80 pointer-events-none`} />
                      ))}

                      {/* LIVE badge */}
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 pointer-events-none">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white text-[10px] font-bold tracking-widest">LIVE</span>
                      </div>

                      {/* Flip camera button */}
                      <button
                        type="button"
                        onClick={flipCamera}
                        className="absolute top-3 right-3 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                        title="Flip camera"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>

                      {/* Countdown overlay */}
                      {countdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-black/50 backdrop-blur-sm rounded-full w-24 h-24 flex items-center justify-center">
                            <span className="text-white text-6xl font-black tabular-nums">{countdown}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <canvas ref={canvasRef} className="hidden" />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={startCountdown}
                        disabled={countdown !== null}
                        className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {countdown !== null ? `Taking in ${countdown}…` : 'Capture (3s timer)'}
                      </button>
                      <button
                        type="button"
                        onClick={captureNow}
                        disabled={countdown !== null}
                        className="px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-600"
                      >
                        Now
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-center text-[11px] text-slate-400">Align your face within the oval — timestamp will be added automatically</p>
                  </div>
                )}

                {/* Photo captured */}
                {!showCamera && capturedPhoto && (
                  <div className="space-y-2">
                    <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-lg shadow-emerald-500/10">
                      <img src={capturedPhoto} alt="Captured selfie" className="w-full object-cover max-h-48" />
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        Verified
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setCapturedPhoto(null); startCamera(cameraFacing) }}
                      className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retake photo
                    </button>
                  </div>
                )}

                {/* Open camera button */}
                {!showCamera && !capturedPhoto && (
                  <button
                    type="button"
                    onClick={() => startCamera('user')}
                    className="w-full py-5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group"
                  >
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 rounded-xl flex items-center justify-center transition-colors">
                        <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          Take Attendance Selfie
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Date & time stamp will be added automatically</p>
                      </div>
                    </div>
                  </button>
                )}
              </div>

              {/* Location */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Location</p>
                  {formData.status === 'field' && (
                    <span className="text-[10px] text-amber-500 font-semibold">Recommended for field</span>
                  )}
                </div>
                <LocationPicker onLocationSelect={handleLocationSelect} required={false} />
              </div>

              {/* Notes */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Notes</p>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes…"
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              {/* Field photo warning */}
              {photoRequired && !capturedPhoto && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl">
                  <span className="text-base">📸</span>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    A selfie photo is required for field attendance
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1 pb-2">
                <button
                  type="button"
                  onClick={() => editingRecord ? setMode('view') : setMode('choice')}
                  className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || (photoRequired && !capturedPhoto)}
                  className="flex-1 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    editingRecord ? 'Update Attendance' : 'Mark Attendance'
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
