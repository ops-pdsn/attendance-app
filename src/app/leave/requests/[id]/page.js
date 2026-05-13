'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'
import NotificationBell from '@/components/NotificationBell'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'

export const dynamic = 'force-dynamic'

export default function LeaveRequestDetail() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const toast = useToast()
  const { confirm } = useConfirm()

  const [loading, setLoading] = useState(true)
  const [request, setRequest] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && params.id) {
      fetchRequest()
    }
  }, [status, params.id])

  const fetchRequest = async () => {
    try {
      const res = await fetch(`/api/leave-requests/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setRequest(data)
      } else {
        toast.error('Leave request not found')
        router.push('/leave')
      }
    } catch (error) {
      console.error('Error fetching request:', error)
      toast.error('Failed to load leave request')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    const confirmed = await confirm({
      title: 'Approve Leave Request',
      message: `Are you sure you want to approve ${request.user?.name}'s ${request.leaveType?.name} request for ${request.days} day(s)?`,
      confirmText: 'Approve',
      type: 'info'
    })

    if (!confirmed) return

    setProcessing(true)
    try {
      const res = await fetch(`/api/leave-requests/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })

      if (res.ok) {
        toast.success('Leave request approved!')
        fetchRequest() // Refresh to show updated status
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to approve request')
      }
    } catch (error) {
      toast.error('Error approving request')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/leave-requests/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason })
      })

      if (res.ok) {
        toast.success('Leave request rejected')
        setShowRejectModal(false)
        setRejectionReason('')
        fetchRequest() // Refresh to show updated status
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to reject request')
      }
    } catch (error) {
      toast.error('Error rejecting request')
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: 'Cancel Leave Request',
      message: 'Are you sure you want to cancel this leave request?',
      confirmText: 'Cancel Request',
      type: 'danger'
    })

    if (!confirmed) return

    setProcessing(true)
    try {
      const res = await fetch(`/api/leave-requests/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      })

      if (res.ok) {
        toast.success('Leave request cancelled')
        fetchRequest()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to cancel request')
      }
    } catch (error) {
      toast.error('Error cancelling request')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'approved':
        return {
          color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
          icon: '✅',
          label: 'Approved'
        }
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          icon: '❌',
          label: 'Rejected'
        }
      case 'pending':
        return {
          color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          icon: '⏳',
          label: 'Pending Approval'
        }
      case 'cancelled':
        return {
          color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
          icon: '🚫',
          label: 'Cancelled'
        }
      default:
        return {
          color: 'bg-slate-100 text-slate-700',
          icon: '❓',
          label: status
        }
    }
  }

  const isOwner = request?.userId === session?.user?.id
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'hr'
  const isManager = request?.user?.manager?.id === session?.user?.id
  const canApprove = (isAdmin || isManager) && request?.status === 'pending'
  const canCancel = isOwner && request?.status === 'pending'

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">Leave request not found</p>
          <Link href="/leave" className="mt-4 text-blue-500 hover:underline">Go back to Leave Management</Link>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(request.status)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-400/20 dark:bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Header */}
        <header className="mb-4 sm:mb-6">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl p-3 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/leave" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl sm:text-2xl">📋</span>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Leave Request</h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Request Details</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <DarkModeToggle />
                <NotificationBell />
                <UserNav />
              </div>
            </div>
          </div>
        </header>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
          
          {/* Status Banner */}
          <div className={`px-4 sm:px-6 py-3 sm:py-4 ${
            request.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800' :
            request.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800' :
            request.status === 'pending' ? 'bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800' :
            'bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{statusConfig.icon}</span>
                <div>
                  <p className={`font-semibold ${
                    request.status === 'approved' ? 'text-emerald-700 dark:text-emerald-400' :
                    request.status === 'rejected' ? 'text-red-700 dark:text-red-400' :
                    request.status === 'pending' ? 'text-amber-700 dark:text-amber-400' :
                    'text-slate-700 dark:text-slate-300'
                  }`}>
                    {statusConfig.label}
                  </p>
                  {request.approver && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      by {request.approver.name} on {new Date(request.approvedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.color}`}>
                {request.status.toUpperCase()}
              </span>
            </div>
            {request.rejectionReason && (
              <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <span className="font-medium">Reason:</span> {request.rejectionReason}
                </p>
              </div>
            )}
          </div>

          {/* Request Details */}
          <div className="p-4 sm:p-6 space-y-6">
            
            {/* Employee Info */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {request.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {request.user?.name || 'Unknown'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{request.user?.email}</p>
                {request.user?.department && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">{request.user.department}</p>
                )}
              </div>
            </div>

            {/* Leave Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Leave Type</p>
                <div className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: request.leaveType?.color || '#3b82f6' }}
                  ></span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {request.leaveType?.name || 'Unknown'}
                  </span>
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: request.leaveType?.color || '#3b82f6' }}
                  >
                    {request.leaveType?.code}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Duration</p>
                <p className="font-semibold text-slate-900 dark:text-white text-lg">
                  {request.days} {request.days === 1 ? 'Day' : 'Days'}
                </p>
                <p className="text-xs text-slate-500">{request.type === 'half' ? 'Half Day' : 'Full Day'}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">From</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {new Date(request.startDate).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="px-4">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
                <div className="text-center flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">To</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {new Date(request.endDate).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Reason */}
            {request.reason && (
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Reason</p>
                <p className="text-slate-700 dark:text-slate-300">{request.reason}</p>
              </div>
            )}

            {/* Emergency Contact */}
            {request.emergencyContact && (
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Emergency Contact</p>
                <p className="text-slate-700 dark:text-slate-300">{request.emergencyContact}</p>
              </div>
            )}

            {/* Timeline */}
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Timeline</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Submitted:</span> {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>
                {request.approvedAt && (
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${request.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-medium">{request.status === 'approved' ? 'Approved' : 'Rejected'}:</span> {new Date(request.approvedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {(canApprove || canCancel) && (
            <div className="px-4 sm:px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row gap-3">
                {canCancel && (
                  <button
                    onClick={handleCancel}
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    Cancel Request
                  </button>
                )}
                {canApprove && (
                  <>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={processing}
                      className="flex-1 px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                    >
                      ❌ Reject
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={processing}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>✅ Approve</>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-4 text-center">
          <Link 
            href="/leave" 
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors"
          >
            ← Back to Leave Management
          </Link>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">❌</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reject Leave Request</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Provide a reason for rejection</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectionReason('')
                  }}
                  className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Reject Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}