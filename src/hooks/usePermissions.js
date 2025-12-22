'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

// Cache permissions
const permissionCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function usePermissions() {
  const { data: session, status } = useSession()
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchUserPermissions = useCallback(async () => {
    if (!session?.user?.id) {
      console.warn('[usePermissions] No user ID in session - check authOptions callbacks')
      setLoading(false)
      return
    }

    try {
      const cacheKey = `user-${session.user.id}`
      const cached = permissionCache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setPermissions(cached.data)
        setLoading(false)
        return
      }

      const res = await fetch(`/api/permissions?userId=${session.user.id}`)
      if (res.ok) {
        const data = await res.json()
        const perms = data.permissions || {}
        setPermissions(perms)
        permissionCache.set(cacheKey, {
          data: perms,
          timestamp: Date.now()
        })
      }
    } catch (error) {
      console.error('[usePermissions] Error:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (status === 'loading') return
    
    if (status === 'unauthenticated') {
      setLoading(false)
      return
    }
    
    if (status === 'authenticated') {
      // Admin and HR don't need to fetch - they have full access
      if (['admin', 'hr'].includes(session?.user?.role)) {
        setLoading(false)
        return
      }
      fetchUserPermissions()
    }
  }, [status, session?.user?.role, fetchUserPermissions])

  // Check if user can perform action on module
  const can = useCallback((action, module) => {
    if (!session?.user) return false

    const role = session.user.role

    // Admin has full access to everything
    if (role === 'admin') return true

    // HR has full access except modifying admin settings
    if (role === 'hr') {
      if (module === 'admin' && action !== 'read') return false
      return true
    }

    // For Manager and Employee: Check database permissions
    const modulePerm = permissions[module]
    
    // If no permission record exists, DENY access
    if (!modulePerm) return false

    // Map action to field name
    switch (action) {
      case 'read':
        return modulePerm.canRead === true
      case 'write':
        return modulePerm.canWrite === true
      case 'edit':
        return modulePerm.canEdit === true
      case 'delete':
        return modulePerm.canDelete === true
      case 'all':
        return modulePerm.canRead && modulePerm.canWrite && 
               modulePerm.canEdit && modulePerm.canDelete
      default:
        return false
    }
  }, [session, permissions])

  // Shorthand methods
  const canRead = useCallback((module) => can('read', module), [can])
  const canWrite = useCallback((module) => can('write', module), [can])
  const canEdit = useCallback((module) => can('edit', module), [can])
  const canDelete = useCallback((module) => can('delete', module), [can])

  // Check if user has ANY access to module (for menu visibility)
  const hasAccess = useCallback((module) => {
    if (!session?.user) return false
    if (session.user.role === 'admin') return true
    if (session.user.role === 'hr') return true
    
    const modulePerm = permissions[module]
    if (!modulePerm) return false
    
    return modulePerm.canRead || modulePerm.canWrite || 
           modulePerm.canEdit || modulePerm.canDelete
  }, [session, permissions])

  const clearCache = useCallback(() => {
    permissionCache.clear()
    setLoading(true)
    fetchUserPermissions()
  }, [fetchUserPermissions])

  return {
    loading,
    permissions,
    can,
    canRead,
    canWrite,
    canEdit,
    canDelete,
    hasAccess,
    isAdmin: session?.user?.role === 'admin',
    isHR: session?.user?.role === 'hr',
    isManager: session?.user?.role === 'manager',
    isEmployee: session?.user?.role === 'employee',
    clearCache,
    role: session?.user?.role,
    userId: session?.user?.id
  }
}

// Permission gate component
export function PermissionGate({ module, action = 'read', children, fallback = null }) {
  const { can, loading } = usePermissions()

  if (loading) return null
  if (!can(action, module)) return fallback

  return children
}

export default usePermissions