'use client'

import { useState } from 'react'

export default function DateRangeFilter({ onFilter, onReset }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activePreset, setActivePreset] = useState(null)

  // Preset date ranges
  const presets = [
    { 
      label: 'Today', 
      getValue: () => {
        const today = new Date().toISOString().split('T')[0]
        return { start: today, end: today }
      }
    },
    { 
      label: 'Yesterday', 
      getValue: () => {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const dateStr = yesterday.toISOString().split('T')[0]
        return { start: dateStr, end: dateStr }
      }
    },
    { 
      label: 'Last 7 Days', 
      getValue: () => {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 7)
        return { 
          start: start.toISOString().split('T')[0], 
          end: end.toISOString().split('T')[0] 
        }
      }
    },
    { 
      label: 'Last 30 Days', 
      getValue: () => {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 30)
        return { 
          start: start.toISOString().split('T')[0], 
          end: end.toISOString().split('T')[0] 
        }
      }
    },
    { 
      label: 'This Month', 
      getValue: () => {
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        return { 
          start: start.toISOString().split('T')[0], 
          end: end.toISOString().split('T')[0] 
        }
      }
    },
    { 
      label: 'Last Month', 
      getValue: () => {
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const end = new Date(now.getFullYear(), now.getMonth(), 0)
        return { 
          start: start.toISOString().split('T')[0], 
          end: end.toISOString().split('T')[0] 
        }
      }
    },
    { 
      label: 'This Year', 
      getValue: () => {
        const now = new Date()
        const start = new Date(now.getFullYear(), 0, 1)
        return { 
          start: start.toISOString().split('T')[0], 
          end: now.toISOString().split('T')[0] 
        }
      }
    },
  ]

  const handlePresetClick = (preset, index) => {
    const { start, end } = preset.getValue()
    setStartDate(start)
    setEndDate(end)
    setActivePreset(index)
    onFilter(start, end)
    setIsOpen(false)
  }

  const handleApply = () => {
    if (startDate && endDate) {
      setActivePreset(null)
      onFilter(startDate, endDate)
      setIsOpen(false)
    }
  }

  const handleReset = () => {
    setStartDate('')
    setEndDate('')
    setActivePreset(null)
    onReset()
    setIsOpen(false)
  }

  const getDisplayText = () => {
    if (activePreset !== null) {
      return presets[activePreset].label
    }
    if (startDate && endDate) {
      const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `${start} - ${end}`
    }
    return 'All Time'
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-gray-700 dark:text-slate-300"
      >
        <svg className="w-4 h-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="hidden sm:inline">{getDisplayText()}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          ></div>
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden">
            {/* Presets */}
            <div className="p-2 border-b border-gray-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">
                Quick Select
              </p>
              <div className="grid grid-cols-2 gap-1">
                {presets.map((preset, index) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset, index)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors text-left ${
                      activePreset === index
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Range */}
            <div className="p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Custom Range
              </p>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setActivePreset(null)
                    }}
                    className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setActivePreset(null)
                    }}
                    className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleApply}
                  disabled={!startDate || !endDate}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}