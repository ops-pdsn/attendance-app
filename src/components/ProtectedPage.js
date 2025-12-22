'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'

export default function ProtectedPage({ children, module, action = 'read' }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { can, loading: permLoading, isAdmin, isHR } = usePermissions()
  const [accessState, setAccessState] = useState('loading')

  useEffect(() => {
    // Still loading session
    if (status === 'loading') return
    
    // Not logged in
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    // Still loading permissions
    if (permLoading) return

    // Admin and HR always have access
    if (isAdmin || isHR) {
      setAccessState('granted')
      return
    }

    // Check permission
    const hasAccess = can(action, module)
    setAccessState(hasAccess ? 'granted' : 'denied')

  }, [status, permLoading, module, action, can, router, isAdmin, isHR])

  // Loading state
  if (accessState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }

  // Access Denied - Show Popup
  if (accessState === 'denied') {
    return (
      <>
        {/* Blurred background */}
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 filter blur-sm pointer-events-none opacity-50">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-2xl mx-auto mb-4"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48 mx-auto mb-2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-64 mx-auto"></div>
          </div>
        </div>

        {/* Popup Modal */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 animate-popup">
            {/* Lock Icon */}
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            {/* Title */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
              Access Denied
            </h2>
            
            {/* Message */}
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-4">
              You don&apos;t have permission to access 
              <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize"> {module}</span>.
            </p>

            {/* User Info */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">User:</span>
                <span className="font-medium text-slate-900 dark:text-white">{session?.user?.name}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">Role:</span>
                <span className="font-medium text-slate-900 dark:text-white capitalize">{session?.user?.role}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center mb-4">
              Contact your administrator for access.
            </p>
            
            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>

        <style jsx global>{`
          @keyframes popup {
            from { opacity: 0; transform: scale(0.9) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .animate-popup { animation: popup 0.3s ease-out; }
        `}</style>
      </>
    )
  }

  // Access Granted
  return children
}