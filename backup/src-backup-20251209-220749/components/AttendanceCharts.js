'use client'

import { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'

export default function AttendanceCharts({ attendance, tasks }) {
  const [activeChart, setActiveChart] = useState('overview')

  // Process attendance data for pie chart
  const getAttendanceOverview = () => {
    const office = attendance.filter(a => a.status === 'office').length
    const field = attendance.filter(a => a.status === 'field').length
    const leave = attendance.filter(a => a.status === 'leave').length
    
    return [
      { name: 'Office', value: office, color: '#10b981' },
      { name: 'Field', value: field, color: '#3b82f6' },
      { name: 'Leave', value: leave, color: '#f59e0b' }
    ].filter(item => item.value > 0)
  }

  // Process task data for pie chart
  const getTaskOverview = () => {
    const completed = tasks.filter(t => t.completed).length
    const pending = tasks.filter(t => !t.completed).length
    
    return [
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'Pending', value: pending, color: '#ef4444' }
    ].filter(item => item.value > 0)
  }

  // Get weekly attendance data
  const getWeeklyData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    const weekData = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayAttendance = attendance.filter(a => a.date.split('T')[0] === dateStr)
      const dayTasks = tasks.filter(t => t.date.split('T')[0] === dateStr)
      
      weekData.push({
        day: days[date.getDay()],
        date: date.getDate(),
        office: dayAttendance.filter(a => a.status === 'office').length,
        field: dayAttendance.filter(a => a.status === 'field').length,
        tasks: dayTasks.length,
        completed: dayTasks.filter(t => t.completed).length
      })
    }

    return weekData
  }

  // Get monthly attendance data
  const getMonthlyData = () => {
    const monthData = []
    const today = new Date()

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayAttendance = attendance.filter(a => a.date.split('T')[0] === dateStr)
      const dayTasks = tasks.filter(t => t.date.split('T')[0] === dateStr)
      
      monthData.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        attendance: dayAttendance.length,
        tasks: dayTasks.length,
        completed: dayTasks.filter(t => t.completed).length
      })
    }

    return monthData
  }

  // Get task priority breakdown
  const getPriorityData = () => {
    const high = tasks.filter(t => t.priority === 'high').length
    const medium = tasks.filter(t => t.priority === 'medium').length
    const low = tasks.filter(t => t.priority === 'low').length

    return [
      { name: 'High', value: high, color: '#ef4444' },
      { name: 'Medium', value: medium, color: '#f59e0b' },
      { name: 'Low', value: low, color: '#10b981' }
    ].filter(item => item.value > 0)
  }

  const attendanceOverview = getAttendanceOverview()
  const taskOverview = getTaskOverview()
  const weeklyData = getWeeklyData()
  const monthlyData = getMonthlyData()
  const priorityData = getPriorityData()

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 text-sm font-medium mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-sm" style={{ color: payload[0].payload.color }}>
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
      {/* Chart Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'weekly', label: '📅 Weekly' },
          { id: 'monthly', label: '📈 Monthly' },
          { id: 'tasks', label: '✅ Tasks' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveChart(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeChart === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart Content */}
      <div className="p-4 sm:p-6">
        {/* Overview Chart */}
        {activeChart === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Attendance Pie Chart */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4 text-center">
                Attendance Distribution
              </h4>
              {attendanceOverview.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={attendanceOverview}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {attendanceOverview.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-gray-600 dark:text-slate-400 text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-500 dark:text-slate-500">
                  No attendance data
                </div>
              )}
            </div>

            {/* Task Completion Pie Chart */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4 text-center">
                Task Completion
              </h4>
              {taskOverview.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={taskOverview}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {taskOverview.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-gray-600 dark:text-slate-400 text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-500 dark:text-slate-500">
                  No task data
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weekly Chart */}
        {activeChart === 'weekly' && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">
              Last 7 Days Activity
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#374151' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-gray-600 dark:text-slate-400 text-sm">{value}</span>}
                />
                <Bar dataKey="office" name="Office" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="field" name="Field" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Tasks Done" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly Chart */}
        {activeChart === 'monthly' && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">
              Last 30 Days Trend
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={{ stroke: '#374151' }}
                  interval={4}
                />
                <YAxis 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#374151' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-gray-600 dark:text-slate-400 text-sm">{value}</span>}
                />
                <Area 
                  type="monotone" 
                  dataKey="attendance" 
                  name="Attendance"
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorAttendance)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  name="Tasks Completed"
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorTasks)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tasks Chart */}
        {activeChart === 'tasks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Priority Breakdown */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4 text-center">
                Tasks by Priority
              </h4>
              {priorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-gray-600 dark:text-slate-400 text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-500 dark:text-slate-500">
                  No task data
                </div>
              )}
            </div>

            {/* Weekly Tasks Bar */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4 text-center">
                Weekly Task Progress
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <YAxis 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="tasks" name="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Done" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}