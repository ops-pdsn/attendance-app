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

export default function AttendanceModal({ date, existingAttendance, allDayAttendance, onClose, onSuccess }) {
  const toast = useToast()
  // mode: 'view' | 'choice' | 'form'
  const [mode, setMode] = useState(existingAttendance ? 'view' : 'choice')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    status: existingAttendance?.status || 'office',
    session: existingAttendance?.session || 'full_day',
    notes: existingAttendance?.notes || '',
    punchIn: fmtTime(existingAttendance?.punchIn),
    punchOut: fmtTime(existingAttendance?.punchOut),
  })
  const [locationData, setLocationData] = useState(null)
  const [capturedPhoto, setCapturedPhoto] = useState(existingAttendance?.photo || null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)
  const [editingRecord, setEditingRecord] = useState(existingAttendance || null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    return () => { if (cameraStream) cameraStream.getTracks().forEach(t => t.stop()) }
  }, [cameraStream])

  useEffect(() => {
    if (showCamera && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
    }
  }, [showCamera, cameraStream])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      setCameraStream(stream)
      setShowCamera(true)
    } catch {
      toast.error('Camera access denied. Please allow camera permission.')
    }
  }

  const capturePhoto = () => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    canvas.width = 320
    canvas.height = 240
    canvas.getContext('2d').drawImage(video, 0, 0, 320, 240)
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.7))
    stopCamera()
  }

  const stopCamera = () => {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop())
    setCameraStream(null)
    setShowCamera(false)
  }

  const handleLocationSelect = useCallback((data) => setLocationData(data), [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        date: localDateStr(date),
        status: formData.status,
        session: formData.session,
        notes: formData.notes,
      }

      if (locationData) {
        payload.latitude = locationData.latitude
        payload.longitude = locationData.longitude
        payload.location = locationData.address || `${locationData.latitude}, ${locationData.longitude}`
      }

      if (capturedPhoto) payload.photo = capturedPhoto

      if (formData.punchIn) {
        const [h, min] = formData.punchIn.split(':')
        const dt = new Date(date)
        dt.setHours(parseInt(h), parseInt(min), 0)
        payload.punchIn = dt.toISOString()
      }
      if (formData.punchOut) {
        const [h, min] = formData.punchOut.split(':')
        const dt = new Date(date)
        dt.setHours(parseInt(h), parseInt(min), 0)
        payload.punchOut = dt.toISOString()
      }

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(editingRecord ? 'Attendance updated!' : 'Attendance marked!')
        onSuccess?.()
        onClose()
      } else {
        toast.error(data.error || 'Failed to mark attendance')
      }
    } catch {
      toast.error('Error saving attendance')
    } finally {
      setLoading(false)
    }
  }

  const fmtDate = date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const statusConfig = {
    office: { icon: '🏢', label: 'Office', color: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' },
    field:  { icon: '🚗', label: 'Field Work', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300' },
    weekoff:{ icon: '🏖️', label: 'Week Off', color: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300' },
    holiday:{ icon: '🎉', label: 'Holiday', color: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300' },
  }

  const sessions = [
    { value: 'full_day', label: 'Full Day' },
    { value: 'morning', label: 'Morning' },
    { value: 'afternoon', label: 'Afternoon' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto border-0 sm:border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="sticky top-0 px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {mode === 'view' ? 'Attendance Details' : mode === 'choice' ? 'What would you like to do?' : editingRecord ? 'Edit Attendance' : 'Mark Attendance'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{fmtDate}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5">
          {/* ── VIEW MODE ── */}
          {mode === 'view' && editingRecord && (() => {
            const cfg = statusConfig[editingRecord.status] || statusConfig.office
            const pIn = new Date(editingRecord.punchIn)
            const pOut = editingRecord.punchOut ? new Date(editingRecord.punchOut) : null
            const hours = pOut ? ((pOut - pIn) / 3_600_000).toFixed(1) : null
            return (
              <div className="space-y-4">
                {/* Status card */}
                <div className={`rounded-2xl border p-4 ${cfg.color}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{cfg.icon}</span>
                    <div>
                      <p className="font-bold text-lg">{cfg.label}</p>
                      <p className="text-sm opacity-80 capitalize">{editingRecord.session?.replace('_', ' ')}</p>
                    </div>
                    {hours && (
                      <div className="ml-auto text-right">
                        <p className="text-2xl font-bold">{hours}h</p>
                        <p className="text-xs opacity-70">worked</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xs opacity-60 mb-0.5">Punch In</p>
                      <p className="font-semibold">{fmtTimeDisplay(editingRecord.punchIn)}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-60 mb-0.5">Punch Out</p>
                      <p className="font-semibold">{fmtTimeDisplay(editingRecord.punchOut)}</p>
                    </div>
                  </div>
                </div>

                {/* Photo */}
                {editingRecord.photo && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={editingRecord.photo} alt="Attendance selfie" className="w-full h-40 object-cover" />
                    <p className="text-center text-xs text-slate-400 py-1.5">Field attendance photo</p>
                  </div>
                )}

                {/* Location */}
                {editingRecord.location && (
                  <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-sm">
                    <span className="text-lg flex-shrink-0">📍</span>
                    <p className="text-slate-600 dark:text-slate-300">{editingRecord.location}</p>
                  </div>
                )}

                {/* Notes */}
                {editingRecord.notes && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-sm text-slate-600 dark:text-slate-300">
                    {editingRecord.notes}
                  </div>
                )}

                {/* Multiple sessions for the day */}
                {allDayAttendance && allDayAttendance.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">All sessions today</p>
                    {allDayAttendance.map(a => (
                      <button key={a.id} onClick={() => setEditingRecord(a)} className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-sm transition-colors ${a.id === editingRecord.id ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                        <span>{statusConfig[a.status]?.icon}</span>
                        <span className="capitalize">{a.session?.replace('_', ' ')}</span>
                        <span className="ml-auto text-slate-400">{fmtTimeDisplay(a.punchIn)}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-sm">Close</button>
                  <button onClick={() => { setMode('form'); setFormData({ status: editingRecord.status, session: editingRecord.session, notes: editingRecord.notes || '', punchIn: fmtTime(editingRecord.punchIn), punchOut: fmtTime(editingRecord.punchOut) }); setCapturedPhoto(editingRecord.photo || null) }} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium text-sm">Edit</button>
                </div>
              </div>
            )
          })()}

          {/* ── CHOICE MODE ── */}
          {mode === 'choice' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center pb-2">No attendance logged for this date</p>
              <button
                onClick={() => setMode('form')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-400 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">📋</div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Log Attendance</p>
                  <p className="text-xs text-slate-500">Mark your attendance for this date</p>
                </div>
                <svg className="w-5 h-5 text-blue-400 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              <button onClick={onClose} className="w-full py-3 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                Cancel
              </button>
            </div>
          )}

          {/* ── FORM MODE ── */}
          {mode === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Where are you working?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'office', icon: '🏢', label: 'Office', color: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20', active: 'border-blue-500' },
                    { value: 'field', icon: '🚗', label: 'Field', color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20', active: 'border-emerald-500' },
                    { value: 'weekoff', icon: '🏖️', label: 'Week Off', color: 'border-purple-400 bg-purple-50 dark:bg-purple-900/20', active: 'border-purple-500' },
                    { value: 'holiday', icon: '🎉', label: 'Holiday', color: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20', active: 'border-orange-500' },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setFormData(f => ({ ...f, status: opt.value }))}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 text-left ${formData.status === opt.value ? opt.color : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                      <span className="text-xl">{opt.icon}</span>
                      <span className={`text-sm font-medium ${formData.status === opt.value ? '' : 'text-slate-600 dark:text-slate-400'}`}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Session */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Session</label>
                <div className="flex gap-2">
                  {sessions.map(s => (
                    <button key={s.value} type="button" onClick={() => setFormData(f => ({ ...f, session: s.value }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.session === s.value ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Punch times (office/field only) */}
              {(formData.status === 'office' || formData.status === 'field') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Punch In</label>
                    <input type="time" value={formData.punchIn} onChange={e => setFormData(f => ({ ...f, punchIn: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Punch Out</label>
                    <input type="time" value={formData.punchOut} onChange={e => setFormData(f => ({ ...f, punchOut: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              )}

              {/* Photo capture — field only */}
              {formData.status === 'field' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">📸 Selfie Photo <span className="text-xs text-amber-500">(Recommended for field)</span></label>
                  {showCamera ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="flex gap-2">
                        <button type="button" onClick={capturePhoto} className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium">📸 Capture</button>
                        <button type="button" onClick={stopCamera} className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : capturedPhoto ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden border-2 border-emerald-400">
                        <img src={capturedPhoto} alt="Captured" className="w-full h-36 object-cover" />
                        <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">✓ Captured</div>
                      </div>
                      <button type="button" onClick={() => { setCapturedPhoto(null); startCamera() }} className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">Retake photo</button>
                    </div>
                  ) : (
                    <button type="button" onClick={startCamera} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
                      <span className="text-xl">📷</span> Open Camera
                    </button>
                  )}
                </div>
              )}

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  📍 Location {formData.status === 'field' && <span className="text-xs text-amber-500">(Recommended)</span>}
                </label>
                <LocationPicker onLocationSelect={handleLocationSelect} required={false} />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes..." rows={2}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => editingRecord ? setMode('view') : setMode('choice')}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium">
                  Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</> : editingRecord ? 'Update' : 'Mark Attendance'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
