'use client'

import { useState } from 'react'

export default function Calendar({ tasks, attendance, holidays, onDateClick, selectedDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Get first day of month and total days
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  // Month names
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  
  // Navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }
  
  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }
  
  const today = () => {
    const now = new Date()
    setCurrentMonth(now)
    onDateClick(now)
  }
  
  // Check if date has tasks or attendance
  const getDateInfo = (day) => {
    const date = new Date(year, month, day)
    const dateStr = date.toISOString().split('T')[0]
    
    const dayTasks = tasks.filter(t => 
      t.date.split('T')[0] === dateStr
    )
    
    const dayAttendance = attendance.find(a => 
      a.date.split('T')[0] === dateStr
    )
    
    const dayHoliday = holidays.find(h => 
      h.date.split('T')[0] === dateStr
    )
    
    return { 
      tasks: dayTasks, 
      attendance: dayAttendance,
      holiday: dayHoliday,
      completedTasks: dayTasks.filter(t => t.completed).length
    }
  }
  
  // Check if date is selected
  const isSelected = (day) => {
    if (!selectedDate) return false
    const date = new Date(year, month, day)
    return date.toDateString() === selectedDate.toDateString()
  }
  
  // Check if date is today
  const isToday = (day) => {
    const date = new Date(year, month, day)
    const now = new Date()
    return date.toDateString() === now.toDateString()
  }
  
  // Generate calendar days
  const days = []
  
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-20 sm:h-24 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"></div>)
  }
  
  // Actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const info = getDateInfo(day)
    const selected = isSelected(day)
    const todayClass = isToday(day)
    
    days.push(
      <div
        key={day}
        onClick={() => onDateClick(new Date(year, month, day))}
        className={`h-20 sm:h-24 border border-gray-200 dark:border-gray-700 p-1 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/50 transition overflow-hidden ${
          selected ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500' : 'bg-white dark:bg-gray-800'
        }`}
      >
        <div className={`text-xs sm:text-sm font-medium mb-1 inline-block ${
          todayClass 
            ? 'bg-blue-600 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center' 
            : 'text-gray-900 dark:text-white'
        }`}>
          {day}
        </div>
        
        {/* Attendance indicator */}
        {info.attendance && (
          <div className={`text-[10px] sm:text-xs px-1 py-0.5 rounded mb-1 truncate ${
            info.attendance.status === 'office' 
              ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700'
              : info.attendance.status === 'field'
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
              : info.attendance.status === 'weekoff'
              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700'
              : 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700'
          }`}>
            {info.attendance.status === 'office' ? '🏢' :
             info.attendance.status === 'field' ? '🚗' :
             info.attendance.status === 'weekoff' ? '🏖️' : '🎉'}
            <span className="hidden sm:inline ml-1">
              {info.attendance.status === 'office' ? 'Office' :
               info.attendance.status === 'field' ? 'Field' :
               info.attendance.status === 'weekoff' ? 'Week Off' : 'Holiday'}
            </span>
          </div>
        )}

        {/* Holiday indicator - show if it's a holiday */}
        {info.holiday && (
          <div className="text-[10px] sm:text-xs px-1 py-0.5 rounded mb-1 truncate bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700">
            🎉
            <span className="hidden sm:inline ml-1">{info.holiday.name}</span>
          </div>
        )}
        
        {/* Tasks indicator */}
        {info.tasks.length > 0 && (
          <div className="space-y-0.5">
            <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">
              📋 {info.completedTasks}/{info.tasks.length}
            </div>
            {/* Priority dots */}
            <div className="flex gap-0.5">
              {info.tasks.some(t => t.priority === 'high') && (
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" title="High priority task"></div>
              )}
              {info.tasks.some(t => t.priority === 'medium') && (
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" title="Medium priority task"></div>
              )}
              {info.tasks.some(t => t.priority === 'low') && (
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Low priority task"></div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-1 sm:gap-2">
          <button
            onClick={today}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500 rounded transition"
          >
            Today
          </button>
          <button
            onClick={prevMonth}
            className="px-2 sm:px-3 py-1 text-sm sm:text-base bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
          >
            ←
          </button>
          <button
            onClick={nextMonth}
            className="px-2 sm:px-3 py-1 text-sm sm:text-base bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
          >
            →
          </button>
        </div>
      </div>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-[10px] sm:text-sm font-semibold text-gray-600 dark:text-gray-400 py-1 sm:py-2">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day[0]}</span>
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0">
        {days}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 sm:mt-4 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700 rounded"></div>
          <span>Office</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 rounded"></div>
          <span>Field</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700 rounded"></div>
          <span>Week Off</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700 rounded"></div>
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1">
          <span>📋 Tasks (done/total)</span>
        </div>
      </div>
    </div>
  )
}