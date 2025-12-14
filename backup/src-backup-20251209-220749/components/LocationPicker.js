'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useGeolocation } from '@/hooks/useGeolocation'

export default function LocationPicker({ onLocationSelect, required = false }) {
  const { location, address, loading, error, getLocation, clearLocation, isSupported } = useGeolocation()
  const [showMap, setShowMap] = useState(false)
  const [hasNotified, setHasNotified] = useState(false)

  useEffect(() => {
    if (location && !hasNotified) {
      console.log('Location received:', { location, address })
      onLocationSelect?.({
        latitude: location.latitude,
        longitude: location.longitude,
        address: address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        accuracy: location.accuracy
      })
      setHasNotified(true)
    }
  }, [location, address, onLocationSelect, hasNotified])

  const handleGetLocation = async () => {
    console.log('Get Location button clicked')
    setHasNotified(false)
    try {
      const coords = await getLocation()
      console.log('Location obtained:', coords)
    } catch (err) {
      console.error('Failed to get location:', err.message)
    }
  }

  const handleClear = () => {
    console.log('Clear button clicked')
    clearLocation()
    setHasNotified(false)
    onLocationSelect?.(null)
  }

  if (!isSupported) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium">Geolocation not supported by your browser</span>
        </div>
      </div>
    )
  }

  const renderLocationCaptured = () => (
    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Location Captured
            </p>
            {address ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                {address}
              </p>
            ) : (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </p>
            )}
            <p className="text-xs text-emerald-500 dark:text-emerald-500 mt-1">
              Accuracy: {Math.round(location.accuracy)}m
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded-lg transition-colors"
            title="View on map"
          >
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Clear location"
          >
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {showMap && (
        <div className="mt-3 rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-700">
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.005},${location.latitude - 0.003},${location.longitude + 0.005},${location.latitude + 0.003}&layer=mapnik&marker=${location.latitude},${location.longitude}`}
            width="100%"
            height="200"
            style={{ border: 0 }}
            loading="lazy"
            title="Location Map"
          />
          
          <a  href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 text-xs text-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition-colors"
          >
            View in Google Maps
          </a>
        </div>
      )}
    </div>
  )

  const renderLocationButton = () => (
    <div>
      <button
        type="button"
        onClick={handleGetLocation}
        disabled={loading}
        className={`w-full p-4 rounded-xl border-2 border-dashed transition-all ${
          error
            ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Getting your location...
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              error 
                ? 'bg-red-100 dark:bg-red-800' 
                : 'bg-blue-100 dark:bg-blue-800'
            }`}>
              <svg 
                className={`w-5 h-5 ${error ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-left">
              <p className={`text-sm font-medium ${
                error ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'
              }`}>
                {error ? 'Location Error - Tap to Retry' : 'Capture Location'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {error || 'Click to get your current location'}
              </p>
            </div>
          </div>
        )}
      </button>

      {required && !location && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Location is recommended for field attendance
        </p>
      )}
    </div>
  )

  return (
    <div className="space-y-3">
      {location ? renderLocationCaptured() : renderLocationButton()}
    </div>
  )
}