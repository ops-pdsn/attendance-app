'use client'

import { useState } from 'react'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'

export default function BackupRestore({ onClose }) {
  const [loading, setLoading] = useState(false)
  const [restoreFile, setRestoreFile] = useState(null)
  const [backupOptions, setBackupOptions] = useState({
    tasks: true,
    attendance: true,
    holidays: true
  })

  const toast = useToast()
  const { confirm } = useConfirm()

  const handleBackup = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (backupOptions.tasks) params.append('tasks', 'true')
      if (backupOptions.attendance) params.append('attendance', 'true')
      if (backupOptions.holidays) params.append('holidays', 'true')

      const res = await fetch(`/api/backup?${params}`)
      if (!res.ok) throw new Error('Backup failed')
      
      const data = await res.json()
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Backup downloaded!')
    } catch (error) {
      toast.error('Failed to create backup')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async () => {
    if (!restoreFile) {
      toast.warning('Please select a backup file')
      return
    }

    const confirmed = await confirm({
      title: 'Restore Data',
      message: 'This will merge the backup data with your existing data. Continue?',
      confirmText: 'Restore',
      cancelText: 'Cancel',
      type: 'warning'
    })

    if (!confirmed) return

    setLoading(true)
    try {
      const fileContent = await restoreFile.text()
      const backupData = JSON.parse(fileContent)

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData)
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      toast.success(`Restored: ${result.tasks || 0} tasks, ${result.attendance || 0} attendance, ${result.holidays || 0} holidays`)
      setRestoreFile(null)
    } catch (error) {
      toast.error(error.message || 'Failed to restore')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Backup & Restore</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Export or import data</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 rounded-xl">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Backup Section */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Create Backup
            </h3>
            
            <div className="space-y-2 mb-4">
              {['tasks', 'attendance', 'holidays'].map(key => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={backupOptions[key]}
                    onChange={(e) => setBackupOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-green-500 focus:ring-green-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{key}</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleBackup}
              disabled={loading || Object.values(backupOptions).every(v => !v)}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Backup
                </>
              )}
            </button>
          </div>

          {/* Restore Section */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Restore from Backup
            </h3>

            <label className="block mb-4">
              <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                restoreFile ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
              }`}>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {restoreFile ? (
                  <p className="text-blue-600 dark:text-blue-400 font-medium">📄 {restoreFile.name}</p>
                ) : (
                  <div className="text-slate-500">
                    <svg className="w-8 h-8 mx-auto mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="font-medium">Click to select backup file</p>
                  </div>
                )}
              </div>
            </label>

            <button
              onClick={handleRestore}
              disabled={loading || !restoreFile}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Restore Data
                </>
              )}
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="w-full px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}