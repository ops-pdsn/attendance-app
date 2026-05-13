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

const STATUS_CONFIG = {
  office: { bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-400', label: 'Office' },
  wfh: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400', label: 'WFH' },
  field: { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-400', label: 'Field' },
  absent: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400', label: 'Absent' },
  leave: { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-400', label: 'Leave' },
  holiday: { bg: 'bg-yellow-100 dark:bg-yellow-500/20', text: 'text-yellow-700 dark:text-yellow-400', label: 'Holiday' }
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getMonthDates(year, month) {
  const count = getDaysInMonth(year, month)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month, i + 1)
    return d.toISOString().split('T')[0]
  })
}

export default function TeamCalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [calendarData, setCalendarData] = useState([])
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const dates = getMonthDates(year, month)
  const firstDay = new Date(year, month, 1).toISOString().split('T')[0]
  const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0]

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated') fetchData()
  }, [status, currentDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/team-calendar?start=${firstDay}&end=${lastDay}`)
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      setCalendarData(data.users || [])
      setHolidays(data.holidays || [])
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const holidayMap = holidays.reduce((acc, h) => {
    acc[h.date.split('T')[0]] = h
    return acc
  }, {})

  const getCellStatus = (userEntry, dateKey) => {
    if (holidayMap[dateKey]) return 'holiday'
    const d = userEntry.days[dateKey]
    if (!d) {
      const wd = new Date(dateKey).getDay()
      if (wd === 0 || wd === 6) return null
      return 'absent'
    }
    if (d.type === 'leave') return 'leave'
    return d.status
  }

  const getCellColor = (s) => {
    if (!s) return ''
    const cfg = STATUS_CONFIG[s]
    return cfg ? `${cfg.bg} ${cfg.text}` : ''
  }

  if (status === 'loading') return null

  return (
    <ProtectedPage module="team">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-full px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Team Calendar</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Attendance & leave overview</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                <button onClick={prevMonth} className="text-slate-500 hover:text-slate-800 dark:hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-sm font-medium text-slate-900 dark:text-white min-w-[120px] text-center">{monthLabel}</span>
                <button onClick={nextMonth} className="text-slate-500 hover:text-slate-800 dark:hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              <NotificationBell />
              <DarkModeToggle />
              <UserNav />
            </div>
          </div>
        </header>

        {/* Legend */}
        <div className="px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4 flex-wrap text-xs">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <span key={key} className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${cfg.bg} ${cfg.text} font-medium`}>{cfg.label}</span>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10">
                  <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400 border-b border-r border-slate-200 dark:border-slate-700 min-w-[160px]">Employee</th>
                  {dates.map(dateKey => {
                    const d = new Date(dateKey)
                    const wd = d.getDay()
                    const isWeekend = wd === 0 || wd === 6
                    const isHoliday = !!holidayMap[dateKey]
                    const isToday = dateKey === new Date().toISOString().split('T')[0]
                    return (
                      <th key={dateKey} className={`px-2 py-3 text-center font-medium border-b border-slate-200 dark:border-slate-700 min-w-[36px] ${isWeekend ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-400' : isHoliday ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' : 'text-slate-600 dark:text-slate-400'} ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}>
                        <div>{d.getDate()}</div>
                        <div className="text-slate-400 font-normal">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {calendarData.map(entry => (
                  <tr key={entry.user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 px-4 py-2.5 border-r border-slate-200 dark:border-slate-700">
                      <p className="font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{entry.user.name}</p>
                      <p className="text-slate-400 text-xs">{entry.user.department || entry.user.role}</p>
                    </td>
                    {dates.map(dateKey => {
                      const s = getCellStatus(entry, dateKey)
                      const dayData = entry.days[dateKey]
                      const d = new Date(dateKey).getDay()
                      const isWeekend = d === 0 || d === 6
                      return (
                        <td key={dateKey} title={s ? (STATUS_CONFIG[s]?.label || s) : ''} className={`px-1 py-2 text-center border-r border-slate-100 dark:border-slate-800 ${isWeekend ? 'bg-slate-50 dark:bg-slate-800/30' : ''}`}>
                          {s && (
                            <span className={`inline-block w-6 h-6 rounded text-center leading-6 font-bold text-xs ${getCellColor(s)}`}>
                              {s === 'office' ? 'P' : s === 'wfh' ? 'W' : s === 'field' ? 'F' : s === 'leave' ? 'L' : s === 'holiday' ? 'H' : s === 'absent' ? 'A' : ''}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {calendarData.length === 0 && (
                  <tr><td colSpan={dates.length + 1} className="text-center py-16 text-slate-400">No team members found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedPage>
  )
}
