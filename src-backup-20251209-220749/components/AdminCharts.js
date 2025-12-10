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
  AreaChart,
  Area
} from 'recharts'

export default function AdminCharts({ stats, users }) {
  const [activeChart, setActiveChart] = useState('users')

  // Users by role
  const getUsersByRole = () => {
    const roles = {}
    users.forEach(user => {
      const role = user.role || 'employee'
      roles[role] = (roles[role] || 0) + 1
    })

    const colors = {
      admin: '#ef4444',
      hr: '#8b5cf6',
      employee: '#3b82f6'
    }

    return Object.entries(roles).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: colors[name] || '#6b7280'
    }))
  }

  // Users by department
  const getUsersByDepartment = () => {
    const departments = {}
    users.forEach(user => {
      const dept = user.department || 'Unassigned'
      departments[dept] = (departments[dept] || 0) + 1
    })

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

    return Object.entries(departments).map(([name, value], index) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: colors[index % colors.length]
    }))
  }

  // User activity (tasks and attendance)
  const getUserActivity = () => {
    return users
      .map(user => ({
        name: user.name?.split(' ')[0] || 'Unknown',
        tasks: user._count?.tasks || 0,
        attendance: user._count?.attendance || 0
      }))
      .sort((a, b) => (b.tasks + b.attendance) - (a.tasks + a.attendance))
      .slice(0, 10) // Top 10 users
  }

  // Active vs Inactive users
  const getUserStatus = () => {
    const active = users.filter(u => u.isActive).length
    const inactive = users.filter(u => !u.isActive).length

    return [
      { name: 'Active', value: active, color: '#10b981' },
      { name: 'Inactive', value: inactive, color: '#ef4444' }
    ].filter(item => item.value > 0)
  }

  const usersByRole = getUsersByRole()
  const usersByDepartment = getUsersByDepartment()
  const userActivity = getUserActivity()
  const userStatus = getUserStatus()

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 text-sm font-medium mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color || entry.fill }}>
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
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Chart Tabs */}
      <div className="flex border-b border-slate-700/50 overflow-x-auto">
        {[
          { id: 'users', label: '👥 Users' },
          { id: 'departments', label: '🏢 Departments' },
          { id: 'activity', label: '📊 Activity' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveChart(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeChart === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart Content */}
      <div className="p-4 sm:p-6">
        {/* Users Charts */}
        {activeChart === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Role */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-4 text-center">
                Users by Role
              </h4>
              {usersByRole.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={usersByRole}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {usersByRole.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-slate-400 text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-slate-500">
                  No user data
                </div>
              )}
            </div>

            {/* By Status */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-4 text-center">
                User Status
              </h4>
              {userStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={userStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {userStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-slate-400 text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-slate-500">
                  No user data
                </div>
              )}
            </div>
          </div>
        )}

        {/* Departments Chart */}
        {activeChart === 'departments' && (
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">
              Users by Department
            </h4>
            {usersByDepartment.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={usersByDepartment} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    type="number"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Users" radius={[0, 4, 4, 0]}>
                    {usersByDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No department data
              </div>
            )}
          </div>
        )}

        {/* Activity Chart */}
        {activeChart === 'activity' && (
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">
              Top 10 Users by Activity
            </h4>
            {userActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    formatter={(value) => <span className="text-slate-400 text-sm">{value}</span>}
                  />
                  <Bar dataKey="tasks" name="Tasks" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="attendance" name="Attendance" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No activity data
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}