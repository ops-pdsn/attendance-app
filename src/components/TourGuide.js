'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const TOUR_KEY = 'att_tour_done_v1'

const STEPS = [
  {
    icon: '👋',
    title: 'Welcome to Attendance Monitor!',
    body: "You're all set. Let's take a quick tour of the key features so you know your way around.",
    page: null,
  },
  {
    icon: '📅',
    title: 'Dashboard Calendar',
    body: 'Click any date on the calendar to log your attendance or view what you already logged. Dates with a colored tile mean attendance is recorded.',
    page: '/',
  },
  {
    icon: '⏱️',
    title: 'Time Sheet',
    body: 'The Timesheet page shows your weekly and monthly attendance with total hours worked, overtime, and any deficit. You can also edit punch-in and punch-out times here.',
    page: '/timesheet',
  },
  {
    icon: '🏖️',
    title: 'Leave',
    body: 'Apply for leave, track your leave balance per type (Casual, Sick, etc.), and view the status of all your requests. Your manager gets notified automatically.',
    page: '/leave',
  },
  {
    icon: '⏰',
    title: 'Overtime',
    body: 'Log overtime hours for extra work done beyond regular hours. You can also request comp-off (compensatory leave) here. Your balance updates once approved.',
    page: '/overtime',
  },
  {
    icon: '📝',
    title: 'Regularization',
    body: 'Forgot to punch-in or made a mistake? Submit a regularization request for any date. Admin or HR will review and correct the record.',
    page: '/regularization',
  },
  {
    icon: '👤',
    title: 'Your Profile & Navigation',
    body: "Click your avatar at the top right to access all features — grouped into categories like Attendance, Leave, Finance, and more. You'll only see what's assigned to your role.",
    page: null,
  },
  {
    icon: '🎉',
    title: "You're ready!",
    body: "That's the overview. Explore at your own pace. You can always restart this tour from your Profile page. Good luck!",
    page: null,
  },
]

export default function TourGuide() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    try {
      const done = localStorage.getItem(TOUR_KEY)
      if (!done) setShow(true)
    } catch {}
  }, [])

  const dismiss = () => {
    try { localStorage.setItem(TOUR_KEY, '1') } catch {}
    setShow(false)
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else dismiss()
  }

  const prev = () => { if (step > 0) setStep(s => s - 1) }

  if (!show) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <>
      {/* Dim overlay */}
      <div className="fixed inset-0 bg-black/40 z-[99990]" onClick={dismiss} />

      {/* Tour card — bottom-center on mobile, center on desktop */}
      <div className="fixed left-4 right-4 bottom-6 sm:left-1/2 sm:right-auto sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[400px] z-[99991]">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-slate-100 dark:bg-slate-700">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          <div className="p-6">
            {/* Icon */}
            <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-inner">
              {current.icon}
            </div>

            {/* Step counter */}
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Step {step + 1} of {STEPS.length}
            </p>

            {/* Content */}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{current.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{current.body}</p>

            {/* Dot indicators */}
            <div className="flex justify-center gap-1.5 mt-5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`rounded-full transition-all ${i === step ? 'w-5 h-2 bg-blue-500' : 'w-2 h-2 bg-slate-300 dark:bg-slate-600'}`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={dismiss}
                className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors px-2"
              >
                Skip tour
              </button>
              <div className="flex gap-2 ml-auto">
                {step > 0 && (
                  <button
                    onClick={prev}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={next}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all"
                >
                  {isLast ? 'Finish 🎉' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
