'use client'

import { useState, useEffect, useCallback } from 'react'

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
  
  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/holidays?year=${selectedYear}`)
      const data = await res.json()
      setHolidays(data)
    } catch (error) {
      console.error('Error fetching holidays:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedYear])
  
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
        alert('✅ Holiday added successfully!')
      } else {
        const data = await res.json()
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error adding holiday:', error)
      alert('❌ Failed to add holiday')
    }
  }
  
  const handleDeleteHoliday = async (id) => {
    if (!confirm('Delete this holiday?')) return
    
    try {
      const res = await fetch(`/api/holidays/${id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        await fetchHolidays()
        onImported?.()
      }
    } catch (error) {
      console.error('Error deleting holiday:', error)
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
    
    if (!confirm(`Import ${india2025Holidays.length} India public holidays for 2025?\n\nThis will replace any existing holidays on these dates.`)) return
    
    setLoading(true)
    
    try {
      const res = await fetch('/api/holidays/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holidays: india2025Holidays })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        alert(`✅ Success! ${data.count} holidays imported for 2025`)
        await fetchHolidays()
        onImported?.()
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error bulk importing:', error)
      alert('❌ Failed to import holidays')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🎉 Holiday Management
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Year Selector & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                📥 Import India Holidays 2025
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {showForm ? '❌ Cancel' : '➕ Add Holiday'}
              </button>
            </div>
          </div>
          
          {/* Add Holiday Form */}
          {showForm && (
            <form onSubmit={handleAddHoliday} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Add New Holiday</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Holiday Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Diwali"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="public">Public Holiday</option>
                  <option value="optional">Optional Holiday</option>
                  <option value="restricted">Restricted Holiday</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Brief description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
              >
                ✅ Add Holiday
              </button>
            </form>
          )}
          
          {/* Holidays List */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Holidays for {selectedYear} ({holidays.length})
            </h3>
            
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin text-4xl mb-2">⏳</div>
                Loading holidays...
              </div>
            ) : holidays.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-5xl mb-3">📅</div>
                <p className="font-medium mb-2">No holidays added for {selectedYear}</p>
                <p className="text-sm">Click &ldquo;Import&rdquo; to load India holidays or &ldquo;Add Holiday&rdquo; to create custom ones</p>
              </div>
            ) : (
              <div className="space-y-3">
                {holidays.map(holiday => (
                  <div
                    key={holiday.id}
                    className="flex items-start justify-between p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg hover:shadow-md transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">🎉</span>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {holiday.name}
                        </h4>
                        {holiday.type !== 'public' && (
                          <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                            {holiday.type}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        📅 {new Date(holiday.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      {holiday.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-500">
                          {holiday.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteHoliday(holiday.id)}
                      className="ml-3 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xl flex-shrink-0"
                      title="Delete holiday"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
