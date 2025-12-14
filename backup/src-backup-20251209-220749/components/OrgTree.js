'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'

export default function OrgTree({ onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  const [selectedUser, setSelectedUser] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const toast = useToast()
  const { confirm } = useConfirm()

  useEffect(() => {
    fetchOrgTree()
  }, [])

  const fetchOrgTree = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/org-tree')
      if (!res.ok) throw new Error('Failed to fetch')
      const result = await res.json()
      setData(result)
      
      // Auto-expand first level
      if (result.tree) {
        const firstLevelIds = result.tree.map(n => n.id)
        setExpandedNodes(new Set(firstLevelIds))
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load organization tree')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const expandAll = () => {
    if (data?.flatList) {
      setExpandedNodes(new Set(data.flatList.map(u => u.id)))
    }
  }

  const collapseAll = () => {
    setExpandedNodes(new Set())
  }

  const handleAssignManager = async (userId, managerId) => {
    try {
      const res = await fetch('/api/org-tree', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, managerId: managerId || null })
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to update')
      }

      toast.success(result.message)
      setShowAssignModal(false)
      setSelectedUser(null)
      fetchOrgTree()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleRemoveManager = async (user) => {
    const confirmed = await confirm({
      title: 'Remove from Hierarchy',
      message: `Remove ${user.name} from their current reporting structure?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'warning'
    })

    if (confirmed) {
      handleAssignManager(user.id, null)
    }
  }

  const getAvatarGradient = (name) => {
    const gradients = [
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-purple-500 to-pink-600',
      'from-cyan-500 to-blue-600',
    ]
    const index = name?.charCodeAt(0) % gradients.length || 0
    return gradients[index]
  }

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'
  }

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
      hr: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
      employee: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
    }
    return styles[role] || styles.employee
  }

  // Tree node component
  const TreeNode = ({ node, depth = 0 }) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children && node.children.length > 0

    // Filter by search
    if (searchTerm) {
      const matchesSearch = node.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.department?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const childMatches = node.children?.some(child => 
        child.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )

      if (!matchesSearch && !childMatches) return null
    }

    return (
      <div>
        <div 
          className="flex items-center gap-2 py-2"
          style={{ paddingLeft: `${depth * 24}px` }}
        >
          {/* Expand Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <svg 
                className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-6 h-6 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
          )}

          {/* User Card */}
          <div className="flex-1 flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group">
            <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarGradient(node.name)} rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-lg`}>
              {getInitials(node.name)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900 dark:text-white">{node.name}</span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getRoleBadge(node.role)}`}>
                  {node.role?.charAt(0).toUpperCase() + node.role?.slice(1)}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {node.department && <span>📁 {node.department}</span>}
                {hasChildren && <span className="ml-2">👥 {node.children.length} reports</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { setSelectedUser(node); setShowAssignModal(true) }}
                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg text-blue-500"
                title="Change Manager"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </button>
              {node.managerId && (
                <button
                  onClick={() => handleRemoveManager(node)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-red-500"
                  title="Remove Manager"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => (
              <TreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Organization Tree</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {data?.stats?.totalUsers || 0} employees • {data?.stats?.managers || 0} managers
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 rounded-xl">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white"
            />
          </div>
          <button onClick={expandAll} className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600">
            Expand All
          </button>
          <button onClick={collapseAll} className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600">
            Collapse All
          </button>
          <button onClick={fetchOrgTree} className="px-3 py-2 text-sm bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500">Loading...</p>
            </div>
          ) : !data?.tree?.length ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-slate-600 dark:text-slate-400">No employees found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {data.tree.map(node => (
                <TreeNode key={node.id} node={node} depth={0} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="w-full px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 font-medium">
            Close
          </button>
        </div>
      </div>

      {/* Assign Manager Modal */}
      {showAssignModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Assign Manager for {selectedUser.name}
            </h3>
            
            <select
              onChange={(e) => handleAssignManager(selectedUser.id, e.target.value)}
              defaultValue={selectedUser.managerId || ''}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white mb-4"
            >
              <option value="">No Manager (Top Level)</option>
              {data?.flatList?.filter(u => u.id !== selectedUser.id).map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>

            <button
              onClick={() => { setShowAssignModal(false); setSelectedUser(null) }}
              className="w-full px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}