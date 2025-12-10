// Utility function to convert data to CSV format
export function convertToCSV(data, columns) {
  if (!data || data.length === 0) return ''
  
  // Create header row
  const header = columns.map(col => col.label).join(',')
  
  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = col.accessor(item)
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = ''
      }
      
      // Convert to string and escape quotes
      value = String(value).replace(/"/g, '""')
      
      // Wrap in quotes if contains comma, newline, or quotes
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        value = `"${value}"`
      }
      
      return value
    }).join(',')
  })
  
  return [header, ...rows].join('\n')
}

// Function to download CSV file
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Export attendance data
export function exportAttendance(attendance) {
  const columns = [
    { label: 'Date', accessor: (item) => new Date(item.date).toLocaleDateString() },
    { label: 'Status', accessor: (item) => item.status },
    { label: 'Session', accessor: (item) => item.session },
    { label: 'Punch In', accessor: (item) => item.punchIn ? new Date(item.punchIn).toLocaleTimeString() : '' },
    { label: 'Punch Out', accessor: (item) => item.punchOut ? new Date(item.punchOut).toLocaleTimeString() : '' },
    { label: 'Notes', accessor: (item) => item.notes || '' },
  ]
  
  const csv = convertToCSV(attendance, columns)
  const date = new Date().toISOString().split('T')[0]
  downloadCSV(csv, `attendance-${date}.csv`)
}

// Export tasks data
export function exportTasks(tasks) {
  const columns = [
    { label: 'Title', accessor: (item) => item.title },
    { label: 'Date', accessor: (item) => new Date(item.date).toLocaleDateString() },
    { label: 'Type', accessor: (item) => item.type },
    { label: 'Priority', accessor: (item) => item.priority },
    { label: 'Completed', accessor: (item) => item.completed ? 'Yes' : 'No' },
    { label: 'Notes', accessor: (item) => item.notes || '' },
  ]
  
  const csv = convertToCSV(tasks, columns)
  const date = new Date().toISOString().split('T')[0]
  downloadCSV(csv, `tasks-${date}.csv`)
}

// Export users data (for admin)
export function exportUsers(users) {
  const columns = [
    { label: 'Name', accessor: (item) => item.name },
    { label: 'Email', accessor: (item) => item.email },
    { label: 'Role', accessor: (item) => item.role },
    { label: 'Department', accessor: (item) => item.department || '' },
    { label: 'Employee ID', accessor: (item) => item.employeeId || '' },
    { label: 'Status', accessor: (item) => item.isActive ? 'Active' : 'Inactive' },
    { label: 'Tasks Count', accessor: (item) => item._count?.tasks || 0 },
    { label: 'Attendance Count', accessor: (item) => item._count?.attendance || 0 },
  ]
  
  const csv = convertToCSV(users, columns)
  const date = new Date().toISOString().split('T')[0]
  downloadCSV(csv, `employees-${date}.csv`)
}