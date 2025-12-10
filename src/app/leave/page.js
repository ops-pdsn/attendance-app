'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import NotificationBell from '@/components/NotificationBell'

export default function LeavePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()
  const { confirm } = useConfirm()

  const [loading, setLoading] = useState(true)
  const [leaveTypes, setLeaveTypes] = useState([])
  const [balances, setBalances] = useState([])
  const [requests, setRequests] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [activeTab, setActiveTab] = useState('balance')

  // Form state
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    type: 'full',
    reason: '',
    emergencyContact: ''
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
      setLoading(true)
      const [typesRes, balancesRes, requestsRes] = await Promise.all([
        fetch('/api/leave-types'),
        fetch('/api/leave-balance'),
        fetch('/api/leave-requests')
      ])

      if (typesRes.ok) setLeaveTypes(await typesRes.json())
      if (balancesRes.ok) setBalances(await balancesRes.json())
      if (requestsRes.ok) setRequests(await requestsRes.json())

      // Fetch pending approvals if manager/admin/hr
      if (session?.user?.role === 'admin' || session?.user?.role === 'hr') {
        const pendingRes = await fetch('/api/leave-requests?pending=true')
        if (pendingRes.ok) setPendingApprovals(await pendingRes.json())
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyLeave = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Leave request submitted successfully!')
        setShowApplyModal(false)
        setFormData({
          leaveTypeId: '',
          startDate: '',
          endDate: '',
          type: 'full',
          reason: '',
          emergencyContact: ''
        })
        fetchData()
      } else {
        toast.error(data.error || 'Failed to submit request')
      }
    } catch (error) {
      toast.error('Error submitting request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (requestId) => {
    const confirmed = await confirm({
      title: 'Approve Leave',
      message: 'Are you sure you want to approve this leave request?',
      confirmText: 'Approve',
      cancelText: 'Cancel',
      type: 'success'
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/leave-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })

      if (res.ok) {
        toast.success('Leave request approved!')
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to approve')
      }
    } catch (error) {
      toast.error('Error approving request')
    }
  }

  const handleReject = async (requestId) => {
    const reason = prompt('Enter rejection reason (optional):')
    
    const confirmed = await confirm({
      title: 'Reject Leave',
      message: 'Are you sure you want to reject this leave request?',
      confirmText: 'Reject',
      cancelText: 'Cancel',
      type: 'danger'
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/leave-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: reason })
      })

      if (res.ok) {
        toast.success('Leave request rejected')
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to reject')
      }
    } catch (error) {
      toast.error('Error rejecting request')
    }
  }

  const handleCancel = async (requestId) => {
    const confirmed = await confirm({
      title: 'Cancel Leave Request',
      message: 'Are you sure you want to cancel this leave request?',
      confirmText: 'Cancel Request',
      cancelText: 'Keep',
      type: 'warning'
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/leave-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      })

      if (res.ok) {
        toast.success('Leave request cancelled')
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to cancel')
      }
    } catch (error) {
      toast.error('Error cancelling request')
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
      approved: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
      rejected: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
      cancelled: 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400'
    }
    return styles[status] || styles.pending
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading leave management...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'balance', label: 'Balance', icon: '💰' },
    { key: 'requests', label: 'My Requests', icon: '📋' }
  ]

  // Add approvals tab for admin/hr
  if (session?.user?.role === 'admin' || session?.user?.role === 'hr') {
    tabs.push({
      key: 'approvals',
      label: `Approvals ${pendingApprovals.length > 0 ? `(${pendingApprovals.length})` : ''}`,
      icon: '✅'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-400/20 dark:bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <header className="mb-8">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🏖️</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Leave Management</h1>
                  <p className="text-slate-500 dark:text-slate-400">Apply and manage your leaves</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-medium shadow-lg shadow-green-500/25 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Apply Leave
                </button>
                <DarkModeToggle />
                <NotificationBell />
                <UserNav />
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-6">
          <div className="inline-flex gap-2 p-1 bg-white/50 dark:bg-slate-800/50 rounded-xl backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'balance' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">💰</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">No leave balances found</p>
                <p className="text-slate-500 text-sm mt-1">Leave types need to be set up by admin</p>
              </div>
            ) : (
              balances.map(balance => (
                <div
                  key={balance.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span 
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: balance.leaveType.color }}
                    >
                      {balance.leaveType.code}
                    </span>
                    {!balance.leaveType.isPaid && (
                      <span className="text-xs text-slate-500">Unpaid</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{balance.leaveType.name}</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Available</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{balance.available}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Used</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{balance.used}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Pending</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">{balance.pending}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Total</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{balance.total}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${balance.total > 0 ? Math.min((balance.used / balance.total) * 100, 100) : 0}%`,
                          backgroundColor: balance.leaveType.color 
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

        {activeTab === 'requests' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📋</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">No leave requests yet</p>
                <p className="text-slate-500 text-sm mt-1">Click &quot;Apply Leave&quot; to submit a request</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {requests.map(request => (
                  <div key={request.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ backgroundColor: request.leaveType.color }}
                        >
                          {request.leaveType.code}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">{request.leaveType.name}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                            {request.days} day(s) • {request.type === 'full' ? 'Full Day' : request.type === 'first_half' ? 'First Half' : 'Second Half'}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-slate-500 mt-1">Reason: {request.reason}</p>
                          )}
                          {request.rejectionReason && (
                            <p className="text-sm text-red-500 mt-1">Rejection reason: {request.rejectionReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(request.status)}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                        {request.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(request.id)}
                            className="text-xs text-red-500 hover:text-red-600 font-medium"
                          >
                            Cancel
                          </button>
                        )}
                        {request.approver && (
                          <p className="text-xs text-slate-500">
                            {request.status === 'approved' ? 'Approved' : 'Rejected'} by {request.approver.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✅</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">No pending approvals</p>
                <p className="text-slate-500 text-sm mt-1">All leave requests have been processed</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {pendingApprovals.map(request => (
                  <div key={request.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {request.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">{request.user?.name}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{request.user?.department}</p>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span 
                              className="px-2 py-0.5 rounded text-xs font-bold text-white"
                              style={{ backgroundColor: request.leaveType.color }}
                            >
                              {request.leaveType.code}
                            </span>
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                              {request.days} day(s)
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-slate-500 mt-1 italic">&quot;{request.reason}&quot;</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">🏖️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Apply for Leave</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Submit a leave request</p>
                </div>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 rounded-xl">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
              {/* Leave Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Leave Type *
                </label>
                <select
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.map(type => {
                    const balance = balances.find(b => b.leaveType.id === type.id)
                    return (
                      <option key={type.id} value={type.id}>
                        {type.name} ({type.code}) - {balance?.available || 0} available
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              {/* Leave Duration Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Duration Type
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'full', label: 'Full Day' },
                    { value: 'first_half', label: 'First Half' },
                    { value: 'second_half', label: 'Second Half' }
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: option.value })}
                      className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        formData.type === option.value
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Reason
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Enter reason for leave..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Emergency Contact (Optional)
                </label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  placeholder="Phone number during leave"
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}