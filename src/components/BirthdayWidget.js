'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function BirthdayWidget() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/birthdays')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  const todayBirthdays = data?.birthdays?.filter(b => b.isToday) || []
  const todayAnniversaries = data?.anniversaries?.filter(a => a.isToday) || []
  const upcoming = [
    ...(data?.birthdays?.filter(b => !b.isToday && b.daysUntil <= 7) || []).map(b => ({ ...b, kind: 'birthday' })),
    ...(data?.anniversaries?.filter(a => !a.isToday && a.daysUntil <= 7) || []).map(a => ({ ...a, kind: 'anniversary' }))
  ].sort((a, b) => a.daysUntil - b.daysUntil)

  if (loading) return null
  if (!data || (todayBirthdays.length === 0 && todayAnniversaries.length === 0 && upcoming.length === 0)) return null

  return (
    <div className="mt-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-500/10 dark:to-purple-500/10 border border-pink-100 dark:border-pink-500/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎉</span>
        <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Celebrations</h3>
      </div>

      {todayBirthdays.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {todayBirthdays.map(b => (
            <div key={b.userId} className="flex items-center gap-2 bg-white/70 dark:bg-slate-800/50 rounded-xl px-3 py-2">
              <span>🎂</span>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-white">{b.name} — Birthday Today!</p>
                {b.department && <p className="text-xs text-slate-500">{b.department}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {todayAnniversaries.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {todayAnniversaries.map(a => (
            <div key={a.userId} className="flex items-center gap-2 bg-white/70 dark:bg-slate-800/50 rounded-xl px-3 py-2">
              <span>🏆</span>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-white">{a.name} — {a.years} Year{a.years > 1 ? 's' : ''}!</p>
                {a.department && <p className="text-xs text-slate-500">{a.department}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Coming up</p>
          {upcoming.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span>{item.kind === 'birthday' ? '🎂' : '🏆'}</span>
                <span>{item.name}</span>
              </span>
              <span className="text-slate-400">in {item.daysUntil}d</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
