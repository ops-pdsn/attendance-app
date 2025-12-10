'use client'

import { useState } from 'react'

export default function TasksByPriority({ tasks, onToggleTask, onDeleteTask }) {
  const [expandedNotes, setExpandedNotes] = useState({})
  
  // Group tasks by priority (including completed)
  const highPriority = tasks.filter(t => t.priority === 'high' && !t.completed)
  const mediumPriority = tasks.filter(t => t.priority === 'medium' && !t.completed)
  const lowPriority = tasks.filter(t => t.priority === 'low' && !t.completed)
  
  // Group completed tasks by priority
  const completedHigh = tasks.filter(t => t.priority === 'high' && t.completed)
  const completedMedium = tasks.filter(t => t.priority === 'medium' && t.completed)
  const completedLow = tasks.filter(t => t.priority === 'low' && t.completed)
  
  const toggleNoteExpansion = (taskId) => {
    setExpandedNotes(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }))
  }
  
  const TaskItem = ({ task, showPriorityBadge = true }) => {
    const isNoteExpanded = expandedNotes[task.id]
    const hasLongNote = task.notes && task.notes.length > 60
    
    const priorityBadges = {
      high: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
      medium: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300',
      low: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
    }
    
    const priorityIcons = {
      high: '🔴',
      medium: '🟡',
      low: '🟢'
    }
    
    return (
      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition border-l-4 border-l-transparent">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggleTask(task.id, !task.completed)}
            className="mt-1 cursor-pointer w-4 h-4"
          />
          
          <div className="flex-1 min-w-0">
            {/* Task Title and Priority Badge */}
            <div className="flex items-start gap-2 mb-1 flex-wrap">
              <div className={`flex-1 font-medium ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                {task.title}
              </div>
              {showPriorityBadge && (
                <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${priorityBadges[task.priority]}`}>
                  {priorityIcons[task.priority]} {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </span>
              )}
            </div>
            
            {/* Task Notes - Always visible and prominent */}
            {task.notes && (
              <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 text-sm flex-shrink-0">📝</span>
                  <div className="flex-1">
                    <div className={`text-sm text-gray-700 dark:text-gray-300 ${!isNoteExpanded && hasLongNote ? 'line-clamp-2' : ''}`}>
                      {task.notes}
                    </div>
                    {hasLongNote && (
                      <button
                        onClick={() => toggleNoteExpansion(task.id)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                      >
                        {isNoteExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => onDeleteTask(task.id)}
            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-lg flex-shrink-0 ml-1"
            title="Delete task"
          >
            🗑️
          </button>
        </div>
      </div>
    )
  }
  
  const PrioritySection = ({ title, tasks, color, icon, showBadge = true }) => {
    if (tasks.length === 0) return null
    
    return (
      <div className="mb-4">
        <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${color}`}>
          <span className="text-lg">{icon}</span>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300">
            {title} ({tasks.length})
          </h4>
        </div>
        <div className="space-y-2">
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} showPriorityBadge={showBadge} />
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div>
      {/* Active Tasks by Priority */}
      <PrioritySection
        title="High Priority"
        tasks={highPriority}
        color="border-red-500 dark:border-red-400"
        icon="🔴"
        showBadge={false}
      />
      
      <PrioritySection
        title="Medium Priority"
        tasks={mediumPriority}
        color="border-yellow-500 dark:border-yellow-400"
        icon="🟡"
        showBadge={false}
      />
      
      <PrioritySection
        title="Low Priority"
        tasks={lowPriority}
        color="border-green-500 dark:border-green-400"
        icon="🟢"
        showBadge={false}
      />
      
      {/* Completed Tasks - Grouped by Priority */}
      {(completedHigh.length > 0 || completedMedium.length > 0 || completedLow.length > 0) && (
        <div className="mt-6 pt-4 border-t-2 border-gray-300 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">✅</span>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">
              Completed ({completedHigh.length + completedMedium.length + completedLow.length})
            </h4>
          </div>
          
          <div className="space-y-2">
            {/* Show completed tasks grouped by original priority */}
            {completedHigh.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-6">High Priority</div>
                {completedHigh.map(task => (
                  <TaskItem key={task.id} task={task} showPriorityBadge={true} />
                ))}
              </div>
            )}
            
            {completedMedium.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-6">Medium Priority</div>
                {completedMedium.map(task => (
                  <TaskItem key={task.id} task={task} showPriorityBadge={true} />
                ))}
              </div>
            )}
            
            {completedLow.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-6">Low Priority</div>
                {completedLow.map(task => (
                  <TaskItem key={task.id} task={task} showPriorityBadge={true} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {tasks.length === 0 && (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
          <div className="text-4xl mb-2">📝</div>
          <p>No tasks for this day</p>
          <p className="text-xs mt-1">Click &ldquo;+ Add Task&rdquo; to create one</p>
        </div>
      )}
    </div>
  )
}