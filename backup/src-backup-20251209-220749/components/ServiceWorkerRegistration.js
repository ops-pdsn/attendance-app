'use client'

import { useEffect, useState } from 'react'

export default function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState(null)

  useEffect(() => {
    // Only register service worker in production or on localhost with proper conditions
    if (typeof window === 'undefined') return
    
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('PWA: Service Workers not supported')
      return
    }

    // Only register on HTTPS or localhost
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1'
    const isHTTPS = window.location.protocol === 'https:'
    
    if (!isLocalhost && !isHTTPS) {
      console.log('PWA: Service Workers require HTTPS')
      return
    }

    // Delay registration to avoid interfering with page load
    const timer = setTimeout(() => {
      registerServiceWorker()
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      setRegistration(reg)
      console.log('PWA: Service Worker registered successfully')

      // Check for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing

        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true)
          }
        })
      })

    } catch (error) {
      // Silently fail - SW is optional enhancement
      console.log('PWA: Service Worker registration skipped:', error.message)
    }
  }

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    window.location.reload()
  }

  if (!updateAvailable) return null

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Update Available</p>
          <p className="text-xs text-blue-100">Click to refresh</p>
        </div>
        <button
          onClick={handleUpdate}
          className="px-4 py-2 bg-white text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors"
        >
          Update
        </button>
      </div>
    </div>
  )
}