'use client'

import { useState, useCallback } from 'react'
import LocationPicker from './LocationPicker'
import { useToast } from './Toast'

export default function AttendanceModal({ date, existingAttendance, onClose, onSuccess }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    status: existingAttendance?.status || 'office',
    session: existingAttendance?.session || 'full',
    notes: existingAttendance?.notes || ''
  })
  const [locationData, setLocationData] = useState(null)

  // Handle location selection from LocationPicker
  const handleLocationSelect = useCallback((data) => {
    console.log('📍 AttendanceModal received location:', data)
    setLocationData(data)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    console.log('📤 Submitting attendance with location:', locationData)

    try {
      const payload = {
        date: date.toISOString(),
        status: formData.status,
        session: formData.session,
        notes: formData.notes
      }

      // Add location data if available
      if (locationData) {
        payload.latitude = locationData.latitude
        payload.longitude = locationData.longitude
        payload.location = locationData.address || `${locationData.latitude}, ${locationData.longitude}`
      }

      console.log('📤 Final payload:', payload)

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      console.log('📥 Response:', data)

      if (res.ok) {
        toast.success(existingAttendance ? 'Attendance updated!' : 'Attendance marked!')
        onSuccess?.()
        onClose()
      } else {
        toast.error(data.error || 'Failed to mark attendance')
      }
    } catch (error) {
      console.error('❌ Submit error:', error)
      toast.error('Error marking attendance')
    } finally {
      setLoading(false)
    }
  }

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {existingAttendance ? 'Update' : 'Mark'} Attendance
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{formattedDate}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Where are you working from?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'office' })}
                className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                  formData.status === 'office'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                  formData.status === 'office' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-100 dark:bg-slate-700'
                }`}>
                  🏢
                </div>
                <div className="text-left">
                  <p className={`font-semibold ${
                    formData.status === 'office' 
                      ? 'text-blue-700 dark:text-blue-400' 
                      : 'text-slate-700 dark:text-slate-300'
                  }`}>Office</p>
                  <p className="text-xs text-slate-500">Working from office</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'field' })}
                className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                  formData.status === 'field'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                  formData.status === 'field' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-100 dark:bg-slate-700'
                }`}>
                  🚗
                </div>
                <div className="text-left">
                  <p className={`font-semibold ${
                    formData.status === 'field' 
                      ? 'text-emerald-700 dark:text-emerald-400' 
                      : 'text-slate-700 dark:text-slate-300'
                  }`}>Field</p>
                  <p className="text-xs text-slate-500">On-site / field work</p>
                </div>
              </button>
            </div>
          </div>

          {/* Session Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Session
            </label>
            <div className="flex gap-2">
              {[
                { value: 'full', label: 'Full Day' },
                { value: 'first_half', label: 'First Half' },
                { value: 'second_half', label: 'Second Half' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, session: option.value })}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    formData.session === option.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              📍 Location 
              {formData.status === 'field' && (
                <span className="text-amber-500 ml-1">(Recommended for field work)</span>
              )}
            </label>
            <LocationPicker 
              onLocationSelect={handleLocationSelect}
              required={formData.status === 'field'}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any notes about your work today..."
              rows={2}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Existing Location Info */}
          {existingAttendance?.location && (
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                📍 Previous location: {existingAttendance.location}
              </p>
            </div>
          )}

          {/* Debug Info (remove in production) */}
          {locationData && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-xs">
              <p className="font-medium text-green-700 dark:text-green-400">✅ Location Ready:</p>
              <p className="text-green-600 dark:text-green-500 font-mono">
                {locationData.latitude?.toFixed(6)}, {locationData.longitude?.toFixed(6)}
              </p>
              {locationData.address && (
                <p className="text-green-600 dark:text-green-500 mt-1">{locationData.address}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {existingAttendance ? 'Update' : 'Mark'} Attendance
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}