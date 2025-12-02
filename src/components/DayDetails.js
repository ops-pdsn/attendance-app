'use client'

import { useState } from 'react'
import TasksByPriority from './TasksByPriority'

export default function DayDetails({ date, tasks, attendance, holidays, onAddTask, onToggleTask, onMarkAttendance, onDeleteTask, onCarryForward }) {
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showAttendanceForm, setShowAttendanceForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [attendanceStatus, setAttendanceStatus] = useState('office')
  const [attendanceNotes, setAttendanceNotes] = useState('')
  const [punchIn, setPunchIn] = useState('')
  const [punchOut, setPunchOut] = useState('')

  if (!date) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center text-gray-500 dark:text-gray-400">
        Select a date to view details
      </div>
    )
  }
  
  const dateStr = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  // Check if this date is a holiday
  const isHoliday = holidays?.find(h => 
    h.date.split('T')[0] === date.toISOString().split('T')[0]
  )
  
  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!taskTitle.trim()) return
    
    await onAddTask({
      title: taskTitle,
      date: date.toISOString(),
      type: 'daily',
      priority: taskPriority,
      notes: taskNotes
    })
    
    setTaskTitle('')
    setTaskNotes('')
    setTaskPriority('medium')
    setShowTaskForm(false)
  }
  
 const handleMarkAttendance = async (e) => {
    e.preventDefault()
    
    // Build attendance data
    const attendanceData = {
      date: date.toISOString(),
      status: attendanceStatus,
      notes: attendanceNotes
    }
    
    // Add punch times if status is office or field
    if (attendanceStatus === 'office' || attendanceStatus === 'field') {
      if (punchIn) {
        const punchInDateTime = new Date(date)
        const [hours, minutes] = punchIn.split(':')
        punchInDateTime.setHours(parseInt(hours), parseInt(minutes), 0)
        attendanceData.punchIn = punchInDateTime.toISOString()
      }
      
      if (punchOut) {
        const punchOutDateTime = new Date(date)
        const [hours, minutes] = punchOut.split(':')
        punchOutDateTime.setHours(parseInt(hours), parseInt(minutes), 0)
        attendanceData.punchOut = punchOutDateTime.toISOString()
      }
    }
    
    await onMarkAttendance(attendanceData)
    
    setAttendanceNotes('')
    setPunchIn('')
    setPunchOut('')
    setShowAttendanceForm(false)
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-4">{dateStr}</h2>
      
      {/* Attendance Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">Attendance</h3>
          {!showAttendanceForm && (
            <button
              onClick={() => {
                setShowAttendanceForm(true)
                // Pre-fill if editing
                if (attendance) {
                  setAttendanceStatus(attendance.status)
                  setAttendanceNotes(attendance.notes || '')
                  if (attendance.punchIn) {
                    const punchInTime = new Date(attendance.punchIn)
                    setPunchIn(`${String(punchInTime.getHours()).padStart(2, '0')}:${String(punchInTime.getMinutes()).padStart(2, '0')}`)
                  }
                  if (attendance.punchOut) {
                    const punchOutTime = new Date(attendance.punchOut)
                    setPunchOut(`${String(punchOutTime.getHours()).padStart(2, '0')}:${String(punchOutTime.getMinutes()).padStart(2, '0')}`)
                  }
                }
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              {attendance ? 'Edit' : '+ Mark'}
            </button>
          )}
        </div>
        
        {attendance && !showAttendanceForm ? (
          <div className={`p-3 rounded-lg ${
            attendance.status === 'office' 
              ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700'
              : attendance.status === 'field'
              ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
              : attendance.status === 'weekoff'
              ? 'bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700'
              : 'bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700'
          }`}>
            <div className="font-medium text-gray-900 dark:text-white mb-2">
              {attendance.status === 'office' ? '🏢 Office' : 
               attendance.status === 'field' ? '🚗 Field Work' :
               attendance.status === 'weekoff' ? '🏖️ Week Off' :
               '🎉 Holiday'}
            </div>
            
            {/* Working hours for office/field */}
            {(attendance.status === 'office' || attendance.status === 'field') && (
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {attendance.punchIn && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Punch In:</span>
                    <span>{new Date(attendance.punchIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                {attendance.punchOut && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Punch Out:</span>
                    <span>{new Date(attendance.punchOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                {attendance.punchIn && attendance.punchOut && (
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-200 dark:border-gray-600 mt-2">
                    <span className="font-medium">Total Hours:</span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      {(() => {
                        const diff = new Date(attendance.punchOut) - new Date(attendance.punchIn)
                        const hours = Math.floor(diff / (1000 * 60 * 60))
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                        return `${hours}h ${minutes}m`
                      })()}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {attendance.notes && (
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                {attendance.notes}
              </div>
            )}
          </div>
        ) : showAttendanceForm ? (
          <form onSubmit={handleMarkAttendance} className="space-y-3">
            {/* Status Options */}
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">Status</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAttendanceStatus('office')}
                  className={`px-3 py-2 text-sm rounded transition ${
                    attendanceStatus === 'office'
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-2 border-green-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  🏢 Office
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceStatus('field')}
                  className={`px-3 py-2 text-sm rounded transition ${
                    attendanceStatus === 'field'
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-2 border-blue-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  🚗 Field
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceStatus('weekoff')}
                  className={`px-3 py-2 text-sm rounded transition ${
                    attendanceStatus === 'weekoff'
                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-2 border-purple-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  🏖️ Week Off
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceStatus('holiday')}
                  className={`px-3 py-2 text-sm rounded transition ${
                    attendanceStatus === 'holiday'
                      ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-2 border-orange-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  🎉 Holiday
                </button>
              </div>
            </div>
            
            {/* Punch In/Out times - only for office/field */}
            {(attendanceStatus === 'office' || attendanceStatus === 'field') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ⏰ Punch In *
                  </label>
                  <input
                    type="time"
                    value={punchIn}
                    onChange={(e) => setPunchIn(e.target.value)}
                    step="300"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base cursor-pointer"
                    placeholder="Select time"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click to scroll & select</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ⏰ Punch Out
                  </label>
                  <input
                    type="time"
                    value={punchOut}
                    onChange={(e) => setPunchOut(e.target.value)}
                    step="300"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base cursor-pointer"
                    placeholder="Select time"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click to scroll & select</p>
                </div>
              </div>
            )}
            
            <input
              type="text"
              placeholder="Notes (optional)"
              value={attendanceNotes}
              onChange={(e) => setAttendanceNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAttendanceForm(false)
                  setAttendanceNotes('')
                  setPunchIn('')
                  setPunchOut('')
                  setAttendanceStatus('office')
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="text-gray-500 dark:text-gray-400 text-sm">No attendance marked</div>
        )}
      </div>

      {isHoliday && (
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <div>
              <div className="font-semibold text-orange-900 dark:text-orange-200">
                {isHoliday.name}
              </div>
              {isHoliday.description && (
                <div className="text-sm text-orange-700 dark:text-orange-300">
                  {isHoliday.description}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Tasks Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">Tasks</h3>
          <div className="flex gap-2">
            {tasks.some(t => !t.completed) && (
              <button
                onClick={() => onCarryForward(date)}
                className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 px-2 py-1 border border-purple-300 dark:border-purple-700 rounded"
                title="Carry forward incomplete tasks to tomorrow"
              >
                ⏭️ Carry Forward
              </button>
            )}
            {!showTaskForm && (
              <button
                onClick={() => setShowTaskForm(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                + Add Task
              </button>
            )}
          </div>
        </div>
        
        {showTaskForm && (
          <form onSubmit={handleAddTask} className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <input
              type="text"
              placeholder="Task title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              required
            />
            
            {/* Priority Selector */}
            <div className="mb-2">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Priority</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTaskPriority('high')}
                  className={`flex-1 px-3 py-2 text-sm rounded transition ${
                    taskPriority === 'high'
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-2 border-red-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  🔴 High
                </button>
                <button
                  type="button"
                  onClick={() => setTaskPriority('medium')}
                  className={`flex-1 px-3 py-2 text-sm rounded transition ${
                    taskPriority === 'medium'
                      ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-2 border-yellow-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  🟡 Medium
                </button>
                <button
                  type="button"
                  onClick={() => setTaskPriority('low')}
                  className={`flex-1 px-3 py-2 text-sm rounded transition ${
                    taskPriority === 'low'
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-2 border-green-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  🟢 Low
                </button>
              </div>
            </div>
            
            <input
              type="text"
              placeholder="Notes (optional)"
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTaskForm(false)
                  setTaskTitle('')
                  setTaskNotes('')
                  setTaskPriority('medium')
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        
        <TasksByPriority
          tasks={tasks}
          onToggleTask={onToggleTask}
          onDeleteTask={onDeleteTask}
        />
      </div>
    </div>
  )
}