'use client'

import { useState, useEffect } from 'react'
import Calendar from '@/components/Calendar'
import DayDetails from '@/components/DayDetails'
import DarkModeToggle from '@/components/DarkModeToggle'
import AutoCarryForward from '@/components/AutoCarryForward'
import HolidayManager from '@/components/HolidayManager'

export default function Home() {
  const [tasks, setTasks] = useState([])
  const [attendance, setAttendance] = useState([])
  const [holidays, setHolidays] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [showHolidayManager, setShowHolidayManager] = useState(false)
  
  // Fetch data on mount
  useEffect(() => {
    fetchData()
  }, [])
  
  const fetchData = async () => {
    try {
      console.log('Fetching data from APIs...')
      
      const [tasksRes, attendanceRes, holidaysRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/attendance'),
        fetch('/api/holidays')
      ])
      
      console.log('API responses:', {
        tasks: tasksRes.status,
        attendance: attendanceRes.status,
        holidays: holidaysRes.status
      })
      
      if (!tasksRes.ok || !attendanceRes.ok || !holidaysRes.ok) {
        throw new Error('Failed to fetch data from APIs')
      }
      
      const tasksData = await tasksRes.json()
      const attendanceData = await attendanceRes.json()
      const holidaysData = await holidaysRes.json()
      
      console.log('Data received:', {
        tasks: tasksData.length,
        attendance: attendanceData.length,
        holidays: holidaysData.length
      })
      
      setTasks(tasksData)
      setAttendance(attendanceData)
      setHolidays(holidaysData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }
  
  // Get tasks for selected date
  const getSelectedDateTasks = () => {
    if (!selectedDate) return []
    const dateStr = selectedDate.toISOString().split('T')[0]
    return tasks.filter(t => t.date.split('T')[0] === dateStr)
  }
  
  // Get attendance for selected date
  const getSelectedDateAttendance = () => {
    if (!selectedDate) return []
    const dateStr = selectedDate.toISOString().split('T')[0]
    return attendance.filter(a => a.date.split('T')[0] === dateStr)
  }
  
  // Add new task
  const handleAddTask = async (taskData) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })
      
      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }
  
  // Toggle task completion
  const handleToggleTask = async (taskId, completed) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      })
      
      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }
  
  // Mark attendance
  const handleMarkAttendance = async (attendanceData) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceData)
      })
      
      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error marking attendance:', error)
    }
  }
  
  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return
    
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }
  
  // Carry forward incomplete tasks
  const handleCarryForward = async (fromDate) => {
    if (!confirm('Carry forward all incomplete tasks from this date to tomorrow?')) return
    
    try {
      const res = await fetch('/api/tasks/carry-forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromDate: fromDate.toISOString(),
          toDate: fromDate.toISOString()
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        alert(data.message)
        fetchData()
      }
    } catch (error) {
      console.error('Error carrying forward tasks:', error)
    }
  }
  
  // Calculate stats
  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.completed).length,
    attendanceDays: attendance.length,
    officeDays: attendance.filter(a => a.status === 'office').length,
    fieldDays: attendance.filter(a => a.status === 'field').length
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <div className="text-xl text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
        {/* Header */}
        <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
              📊 Attendance
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Track tasks & attendance
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowHolidayManager(true)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
            >
              🎉 Holidays
            </button>
            <DarkModeToggle />
          </div>
        </header>
        
        {/* Stats Cards */}
        <div className="mb-4 sm:mb-6 -mx-2 px-2 overflow-x-auto">
          <div className="flex sm:grid sm:grid-cols-5 gap-3 min-w-max sm:min-w-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 min-w-[120px] sm:min-w-0">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Tasks</div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTasks}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 min-w-[120px] sm:min-w-0">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Done</div>
              <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.completedTasks}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 min-w-[120px] sm:min-w-0">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Days</div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.attendanceDays}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 min-w-[120px] sm:min-w-0">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Office</div>
              <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.officeDays}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 min-w-[120px] sm:min-w-0">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Field</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.fieldDays}</div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 order-1">
            <Calendar
              tasks={tasks}
              attendance={attendance}
              holidays={holidays}
              selectedDate={selectedDate}
              onDateClick={setSelectedDate}
            />
          </div>
          
          <div className="order-2">
            <DayDetails
              date={selectedDate}
              tasks={getSelectedDateTasks()}
              attendance={getSelectedDateAttendance()}
              holidays={holidays}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onMarkAttendance={handleMarkAttendance}
              onDeleteTask={handleDeleteTask}
              onCarryForward={handleCarryForward}
            />
          </div>
        </div>
        
        <AutoCarryForward onCarryForward={handleCarryForward} />
        
        {showHolidayManager && (
          <HolidayManager
            onClose={() => setShowHolidayManager(false)}
            onImported={fetchData}
          />
        )}
      </div>
    </div>
  )
}