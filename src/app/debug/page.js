'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePermissions } from '@/hooks/usePermissions'

export const dynamic = 'force-dynamic'

export default function DebugPermissionsPage() {
  const { data: session, status } = useSession()
  const { 
    permissions, 
    loading: permLoading, 
    can, 
    canRead, 
    hasAccess,
    isAdmin,
    isHR,
    role,
    userId
  } = usePermissions()
  
  const [apiResult, setApiResult] = useState(null)
  const [error, setError] = useState(null)

  // Direct API test
  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/permissions?userId=${session.user.id}`)
        .then(r => r.json())
        .then(data => setApiResult(data))
        .catch(err => setError(err.message))
    }
  }, [session?.user?.id])

  const modules = ['timesheet', 'leave', 'shifts', 'notifications', 'team', 'analytics', 'payroll', 'admin']

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">🔍 Permission Debug Page</h1>

      {/* Step 1: Session Check */}
      <div className="bg-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">Step 1: Session Status</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Status:</span>
            <span className={`ml-2 px-2 py-1 rounded ${status === 'authenticated' ? 'bg-green-500' : 'bg-red-500'}`}>
              {status}
            </span>
          </div>
          <div>
            <span className="text-slate-400">User ID:</span>
            <span className={`ml-2 px-2 py-1 rounded ${session?.user?.id ? 'bg-green-500' : 'bg-red-500'}`}>
              {session?.user?.id || 'MISSING!'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Role:</span>
            <span className="ml-2 px-2 py-1 rounded bg-purple-500">
              {session?.user?.role || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Name:</span>
            <span className="ml-2">{session?.user?.name || 'N/A'}</span>
          </div>
        </div>
        
        {!session?.user?.id && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
            ⚠️ <strong>PROBLEM:</strong> session.user.id is missing! 
            <br />This means authOptions callbacks are not working. Try logging out and back in.
          </div>
        )}
      </div>

      {/* Step 2: Hook Status */}
      <div className="bg-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">Step 2: usePermissions Hook</h2>
        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
          <div>
            <span className="text-slate-400">Loading:</span>
            <span className={`ml-2 px-2 py-1 rounded ${permLoading ? 'bg-yellow-500' : 'bg-green-500'}`}>
              {permLoading ? 'Loading...' : 'Done'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">isAdmin:</span>
            <span className={`ml-2 px-2 py-1 rounded ${isAdmin ? 'bg-green-500' : 'bg-slate-600'}`}>
              {isAdmin ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">isHR:</span>
            <span className={`ml-2 px-2 py-1 rounded ${isHR ? 'bg-green-500' : 'bg-slate-600'}`}>
              {isHR ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
        <div>
          <span className="text-slate-400">Permissions Object:</span>
          <pre className="mt-2 p-3 bg-slate-700 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(permissions, null, 2)}
          </pre>
        </div>
      </div>

      {/* Step 3: Direct API Result */}
      <div className="bg-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">Step 3: Direct API Call</h2>
        <p className="text-sm text-slate-400 mb-2">
          GET /api/permissions?userId={session?.user?.id || 'N/A'}
        </p>
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 mb-4">
            Error: {error}
          </div>
        )}
        <pre className="p-3 bg-slate-700 rounded text-xs overflow-auto max-h-60">
          {apiResult ? JSON.stringify(apiResult, null, 2) : 'Loading...'}
        </pre>
      </div>

      {/* Step 4: Permission Matrix */}
      <div className="bg-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">Step 4: Permission Check Results</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left py-2 px-3">Module</th>
                <th className="text-center py-2 px-3">hasAccess()</th>
                <th className="text-center py-2 px-3">can('read')</th>
                <th className="text-center py-2 px-3">can('write')</th>
                <th className="text-center py-2 px-3">can('edit')</th>
                <th className="text-center py-2 px-3">can('delete')</th>
              </tr>
            </thead>
            <tbody>
              {modules.map(module => (
                <tr key={module} className="border-b border-slate-700/50">
                  <td className="py-2 px-3 font-medium">{module}</td>
                  <td className="text-center py-2 px-3">
                    <span className={`px-2 py-1 rounded text-xs ${hasAccess(module) ? 'bg-green-500' : 'bg-red-500'}`}>
                      {hasAccess(module) ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className={`px-2 py-1 rounded text-xs ${can('read', module) ? 'bg-green-500' : 'bg-red-500'}`}>
                      {can('read', module) ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className={`px-2 py-1 rounded text-xs ${can('write', module) ? 'bg-green-500' : 'bg-red-500'}`}>
                      {can('write', module) ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className={`px-2 py-1 rounded text-xs ${can('edit', module) ? 'bg-green-500' : 'bg-red-500'}`}>
                      {can('edit', module) ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className={`px-2 py-1 rounded text-xs ${can('delete', module) ? 'bg-green-500' : 'bg-red-500'}`}>
                      {can('delete', module) ? '✓' : '✗'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diagnosis */}
      <div className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">🩺 Auto-Diagnosis</h2>
        <ul className="space-y-2 text-sm">
          {!session?.user?.id && (
            <li className="text-red-400">❌ session.user.id is missing - Logout and login again</li>
          )}
          {session?.user?.id && Object.keys(permissions).length === 0 && !isAdmin && !isHR && (
            <li className="text-red-400">❌ No permissions in database for this user - Go to /permissions and assign</li>
          )}
          {session?.user?.id && (isAdmin || isHR) && (
            <li className="text-green-400">✅ User is {role} - Full access granted automatically</li>
          )}
          {session?.user?.id && !isAdmin && !isHR && Object.keys(permissions).length > 0 && (
            <li className="text-green-400">✅ Permissions loaded from database</li>
          )}
          {apiResult?.permissions && (
            <li className="text-green-400">✅ API returning permissions correctly</li>
          )}
        </ul>
      </div>
    </div>
  )
}