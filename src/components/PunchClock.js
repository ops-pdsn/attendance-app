'use client'

import { useState, useEffect } from 'react'
import { useToast } from './Toast'

export default function PunchClock() {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [todayRecord, setTodayRecord] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    fetchTodayRecord()
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchTodayRecord = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch('/api/attendance?start=' + today + '&end=' + today)
      if (res.ok) {
        const data = await res.json()
        if (data.length > 0) {
          setTodayRecord(data[0])
        }
      }
    } catch (error) {
      console.error('Error fetching today record:', error)
    }
  }

  const handlePunchIn = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          status: 'office',
          punchIn: new Date().toISOString()
        })
      })

      if (res.ok) {
        toast.success('Punched in successfully!')
        fetchTodayRecord()
      } else {
        toast.error('Failed to punch in')
      }
    } catch (error) {
      toast.error('Error punching in')
    } finally {
      setLoading(false)
    }
  }

  const handlePunchOut = async () => {
    if (!todayRecord) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todayRecord.id,
          punchOut: new Date().toISOString()
        })
      })

      if (res.ok) {
        toast.success('Punched out successfully!')
        fetchTodayRecord()
      } else {
        toast.error('Failed to punch out')
      }
    } catch (error) {
      toast.error('Error punching out')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const isPunchedIn = todayRecord?.punchIn && !todayRecord?.punchOut
  const isPunchedOut = todayRecord?.punchIn && todayRecord?.punchOut

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
      <div className="text-center mb-4">
        <p className="text-4xl font-mono font-bold text-slate-900 dark:text-white">
          {formatTime(currentTime)}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {isPunchedOut ? (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Day Complete
          </div>
          <p className="text-sm text-slate-500 mt-2">
            {new Date(todayRecord.punchIn).toLocaleTimeString()} - {new Date(todayRecord.punchOut).toLocaleTimeString()}
          </p>
        </div>
      ) : isPunchedIn ? (
        <button
          onClick={handlePunchOut}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          )}
          Punch Out
        </button>
      ) : (
        <button
          onClick={handlePunchIn}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          )}
          Punch In
        </button>
      )}

      {todayRecord?.punchIn && !todayRecord?.punchOut && (
        <p className="text-center text-sm text-slate-500 mt-3">
          Punched in at {new Date(todayRecord.punchIn).toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}