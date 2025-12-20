'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'
import NotificationBell from '@/components/NotificationBell'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'

export const dynamic = 'force-dynamic'

export default function LeaveManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()
  const { confirm } = useConfirm()

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('balance')
  const [balances, setBalances] = useState([])
  const [requests, setRequests] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState([])

  // Form state
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchData()
    }
  }, [status, router])

  const fetchData = async () => {
    try {
      const [balancesRes, requestsRes, typesRes] = await Promise.all([
        fetch('/api/leave/balance'),
        fetch('/api/leave/requests'),
        fetch('/api/leave/types')
      ])

      if (balancesRes.ok) setBalances(await balancesRes.json())
      if (requestsRes.ok) {
        const data = await requestsRes.json()
        setRequests(data)
        setPendingApprovals(data.filter(r => r.status === 'pending' && r.userId !== session?.user?.id))
      }
      if (typesRes.ok) setLeaveTypes(await typesRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load leave data')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyLeave = async (e) => {
    e.preventDefault()
    if (!formData.leaveTypeId || !formData.startDate || !formData.endDate) {
      toast.warning('Please fill all required fields')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/leave/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success('Leave request submitted!')
        setShowApplyModal(false)
        setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' })
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to submit request')
      }
    } catch (error) {
      toast.error('Error submitting request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveReject = async (requestId, action) => {
    const confirmed = await confirm({
      title: action === 'approved' ? 'Approve Leave' : 'Reject Leave',
      message: `Are you sure you want to ${action === 'approved' ? 'approve' : 'reject'} this leave request?`,
      confirmText: action === 'approved' ? 'Approve' : 'Reject',
      type: action === 'approved' ? 'info' : 'danger'
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/leave/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      })

      if (res.ok) {
        toast.success(`Leave ${action}!`)
        fetchData()
      } else {
        toast.error('Failed to update request')
      }
    } catch (error) {
      toast.error('Error updating request')
    }
  }

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 0
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    }
  }

  const tabs = [
    { key: 'balance', label: 'Balance', icon: '💰' },
    { key: 'requests', label: 'My Requests', icon: '📋' },
    ...(session?.user?.role === 'admin' || session?.user?.role === 'hr' || session?.user?.role === 'manager'
      ? [{ key: 'approvals', label: 'Approvals', icon: '✅', badge: pendingApprovals.length }]
      : []
    )
  ]

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-400/20 dark:bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Header */}
        <header className="mb-4 sm:mb-6">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl p-3 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              {/* Title */}
              <div className="flex items-center gap-3">
                <Link href="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl sm:text-2xl">🏖️</span>
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Leave Management</h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Apply and manage your leaves</p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-green-500/25 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Apply Leave</span>
                  <span className="sm:hidden">Apply</span>
                </button>
                <DarkModeToggle />
                <NotificationBell />
                <UserNav />
              </div>
            </div>
          </div>
        </header>

        {/* Tabs - Scrollable on mobile */}
        <div className="mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="inline-flex gap-1 sm:gap-2 p-1 bg-white/50 dark:bg-slate-800/50 rounded-xl backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full min-w-[18px] text-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Balance Tab */}
        {activeTab === 'balance' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {balances.length === 0 ? (
              <div className="col-span-full text-center py-8 sm:py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="text-2xl sm:text-3xl">💰</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium text-sm sm:text-base">No leave balances found</p>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">Contact admin to set up leave types</p>
              </div>
            ) : (
              balances.map(balance => (
                <div
                  key={balance.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span 
                      className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: balance.leaveType?.color || '#3b82f6' }}
                    >
                      {balance.leaveType?.code || 'N/A'}
                    </span>
                    {balance.leaveType && !balance.leaveType.isPaid && (
                      <span className="text-xs text-slate-500">Unpaid</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base mb-2 sm:mb-3">
                    {balance.leaveType?.name || 'Unknown'}
                  </h3>
                  
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Available</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{balance.available}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Used</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{balance.used}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Pending</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">{balance.pending}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 sm:mt-4">
                    <div className="h-1.5 sm:h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${balance.total > 0 ? Math.min((balance.used / balance.total) * 100, 100) : 0}%`,
                          backgroundColor: balance.leaveType?.color || '#3b82f6'
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 text-right">
                      {balance.used} / {balance.total} used
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            {requests.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="text-2xl sm:text-3xl">📋</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium text-sm sm:text-base">No leave requests yet</p>
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="mt-3 sm:mt-4 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium"
                >
                  Apply for Leave
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {requests.filter(r => r.userId === session?.user?.id).map(request => (
                  <div key={request.id} className="p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-start sm:items-center gap-3">
                        <div 
                          className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"
                          style={{ backgroundColor: request.leaveType?.color || '#3b82f6' }}
                        />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white text-sm sm:text-base">
                            {request.leaveType?.name || 'Leave'}
                          </p>
                          <p className="text-xs sm:text-sm text-slate-500">
                            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                            <span className="ml-2 text-slate-400">({request.days} days)</span>
                          </p>
                          {request.reason && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{request.reason}</p>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium self-start sm:self-auto ${getStatusColor(request.status)}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === 'approvals' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="text-2xl sm:text-3xl">✅</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium text-sm sm:text-base">No pending approvals</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {pendingApprovals.map(request => (
                  <div key={request.id} className="p-3 sm:p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                          {request.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white text-sm sm:text-base truncate">
                            {request.user?.name || 'Unknown'}
                          </p>
                          <p className="text-xs sm:text-sm text-slate-500 truncate">
                            {request.leaveType?.name} • {request.days} days
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                          </p>
                          {request.reason && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{request.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 sm:justify-end">
                        <button
                          onClick={() => handleApproveReject(request.id, 'rejected')}
                          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs sm:text-sm font-medium"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveReject(request.id, 'approved')}
                          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-medium"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-lg sm:text-xl">🏖️</span>
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">Apply for Leave</h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Submit your leave request</p>
                </div>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 rounded-xl">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleApplyLeave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Leave Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate}
                    className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              {/* Days Preview */}
              {calculateDays() > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    📅 {calculateDays()} day{calculateDays() > 1 ? 's' : ''} of leave
                  </p>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Reason (Optional)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  placeholder="Enter reason for leave..."
                  className="w-full px-3 sm:px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
            </form>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyLeave}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}