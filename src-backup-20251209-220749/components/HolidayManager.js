'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'

export default function HolidayManager({ onClose, onImported }) {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Form state
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState('public')
  const [description, setDescription] = useState('')
  
  // Custom hooks for toast and confirm
  const toast = useToast()
  const { confirm } = useConfirm()
  
  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/holidays?year=${selectedYear}`)
      const data = await res.json()
      setHolidays(data)
    } catch (error) {
      console.error('Error fetching holidays:', error)
      toast.error('Failed to load holidays')
    } finally {
      setLoading(false)
    }
  }, [selectedYear, toast])
  
  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])
  
  const handleAddHoliday = async (e) => {
    e.preventDefault()
    
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date, type, description })
      })
      
      if (res.ok) {
        setName('')
        setDate('')
        setType('public')
        setDescription('')
        setShowForm(false)
        await fetchHolidays()
        onImported?.()
        toast.success('Holiday added successfully!')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to add holiday')
      }
    } catch (error) {
      console.error('Error adding holiday:', error)
      toast.error('Failed to add holiday')
    }
  }
  
  const handleDeleteHoliday = async (id, holidayName) => {
    const confirmed = await confirm({
      title: 'Delete Holiday',
      message: `Are you sure you want to delete "${holidayName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Keep',
      type: 'danger'
    })
    
    if (!confirmed) return
    
    try {
      const res = await fetch(`/api/holidays/${id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        toast.success('Holiday deleted')
        await fetchHolidays()
        onImported?.()
      } else {
        toast.error('Failed to delete holiday')
      }
    } catch (error) {
      console.error('Error deleting holiday:', error)
      toast.error('Failed to delete holiday')
    }
  }
  
  const handleBulkImport = async () => {
    // India Public Holidays 2025
    const india2025Holidays = [
      { name: "New Year's Day", date: '2025-01-01', type: 'public', description: 'First day of the year' },
      { name: "Republic Day", date: '2025-01-26', type: 'public', description: 'National holiday' },
      { name: "Holi", date: '2025-03-14', type: 'public', description: 'Festival of colors' },
      { name: "Eid ul-Fitr", date: '2025-03-31', type: 'public', description: 'Islamic festival' },
      { name: "Good Friday", date: '2025-04-18', type: 'public', description: 'Christian holiday' },
      { name: "Buddha Purnima", date: '2025-05-12', type: 'public', description: 'Buddhist festival' },
      { name: "Eid ul-Adha", date: '2025-06-07', type: 'public', description: 'Islamic festival' },
      { name: "Independence Day", date: '2025-08-15', type: 'public', description: 'National holiday' },
      { name: "Janmashtami", date: '2025-08-16', type: 'public', description: 'Hindu festival' },
      { name: "Gandhi Jayanti", date: '2025-10-02', type: 'public', description: 'National holiday' },
      { name: "Dussehra", date: '2025-10-02', type: 'public', description: 'Hindu festival' },
      { name: "Diwali", date: '2025-10-20', type: 'public', description: 'Festival of lights' },
      { name: "Diwali Holiday", date: '2025-10-21', type: 'public', description: 'Day after Diwali' },
      { name: "Guru Nanak Jayanti", date: '2025-11-05', type: 'public', description: 'Sikh festival' },
      { name: "Christmas", date: '2025-12-25', type: 'public', description: 'Christian holiday' }
    ]
    
    const confirmed = await confirm({
      title: 'Import India Holidays 2025',
      message: `This will import ${india2025Holidays.length} public holidays for India 2025. Any existing holidays on these dates will be replaced.`,
      confirmText: 'Import',
      cancelText: 'Cancel',
      type: 'info'
    })
    
    if (!confirmed) return
    
    setLoading(true)
    
    try {
      const res = await fetch('/api/holidays/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holidays: india2025Holidays })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success(`${data.count} holidays imported successfully!`)
        await fetchHolidays()
        onImported?.()
      } else {
        toast.error(data.error || 'Failed to import holidays')
      }
    } catch (error) {
      console.error('Error bulk importing:', error)
      toast.error('Failed to import holidays')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700"
        style={{ animation: 'modalIn 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
              <span className="text-xl">🎉</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Holiday Management
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage public holidays</p>
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
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Year Selector & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {[2024, 2025, 2026, 2027, 2028].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleBulkImport}
                disabled={loading}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/25 text-sm font-medium flex items-center gap-2"
              >
                <span>🇮🇳</span>
                Import India Holidays 2025
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className={`px-4 py-2.5 rounded-xl transition-all text-sm font-medium flex items-center gap-2 ${
                  showForm 
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25 hover:from-blue-600 hover:to-indigo-600'
                }`}
              >
                {showForm ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Holiday
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Add Holiday Form */}
          {showForm && (
            <form 
              onSubmit={handleAddHoliday} 
              className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700/50 dark:to-slate-700/30 rounded-xl border border-blue-200 dark:border-slate-600"
              style={{ animation: 'fadeIn 0.2s ease-out' }}
            >
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-lg">📅</span>
                Add New Holiday
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Holiday Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Diwali"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="public">Public Holiday</option>
                    <option value="optional">Optional Holiday</option>
                    <option value="restricted">Restricted Holiday</option>
                  </select>
                </div>
              
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 font-medium transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Add Holiday
              </button>
            </form>
          )}
          
          {/* Holidays List */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-lg">📋</span>
              Holidays for {selectedYear} 
              <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-normal">
                {holidays.length}
              </span>
            </h3>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 dark:text-slate-400">Loading holidays...</p>
              </div>
            ) : holidays.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-700/30 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📅</span>
                </div>
                <p className="font-medium text-slate-700 dark:text-slate-300 mb-2">No holidays for {selectedYear}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Click &quot;Import&quot; or &quot;Add Holiday&quot; to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {holidays.map((holiday, index) => (
                  <div
                    key={holiday.id}
                    className="group flex items-start justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-700/50 dark:to-slate-700/30 border border-amber-200 dark:border-slate-600 rounded-xl hover:shadow-lg transition-all"
                    style={{ animation: `fadeIn 0.3s ease-out ${index * 0.05}s both` }}
                  >
                    <div className="flex-1 min-w-0 flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/25">
                        <span className="text-lg">🎊</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-slate-900 dark:text-white">
                            {holiday.name}
                          </h4>
                          {holiday.type !== 'public' && (
                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium">
                              {holiday.type}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(holiday.date)}
                        </p>
                        {holiday.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-500">
                            {holiday.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteHoliday(holiday.id, holiday.name)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Delete holiday"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 font-medium transition-all"
          >
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}