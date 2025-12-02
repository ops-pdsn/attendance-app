'use client'

export default function TasksByPriority({ tasks, onToggleTask, onDeleteTask }) {
  // Group tasks by priority
  const highPriority = tasks.filter(t => t.priority === 'high' && !t.completed)
  const mediumPriority = tasks.filter(t => t.priority === 'medium' && !t.completed)
  const lowPriority = tasks.filter(t => t.priority === 'low' && !t.completed)
  const completed = tasks.filter(t => t.completed)
  
  const TaskItem = ({ task }) => (
    <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggleTask(task.id, !task.completed)}
        className="mt-1 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <div className={task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}>
          {task.title}
        </div>
        {task.notes && (
          <div className="text-sm text-gray-600 dark:text-gray-400 break-words">{task.notes}</div>
        )}
      </div>
      <button
        onClick={() => onDeleteTask(task.id)}
        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm flex-shrink-0"
        title="Delete task"
      >
        🗑️
      </button>
    </div>
  )
  
  const PrioritySection = ({ title, tasks, color, icon }) => {
    if (tasks.length === 0) return null
    
    return (
      <div className="mb-4">
        <div className={`flex items-center gap-2 mb-2 pb-1 border-b-2 ${color}`}>
          <span className="text-lg">{icon}</span>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300">
            {title} ({tasks.length})
          </h4>
        </div>
        <div className="space-y-2">
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div>
      <PrioritySection
        title="High Priority"
        tasks={highPriority}
        color="border-red-500 dark:border-red-400"
        icon="🔴"
      />
      
      <PrioritySection
        title="Medium Priority"
        tasks={mediumPriority}
        color="border-yellow-500 dark:border-yellow-400"
        icon="🟡"
      />
      
      <PrioritySection
        title="Low Priority"
        tasks={lowPriority}
        color="border-green-500 dark:border-green-400"
        icon="🟢"
      />
      
      {completed.length > 0 && (
        <PrioritySection
          title="Completed"
          tasks={completed}
          color="border-gray-400 dark:border-gray-600"
          icon="✅"
        />
      )}
      
      {tasks.length === 0 && (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          No tasks for this day
        </div>
      )}
    </div>
  )
}