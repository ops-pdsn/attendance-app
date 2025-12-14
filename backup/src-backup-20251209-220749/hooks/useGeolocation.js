'use client'

import { useState, useCallback } from 'react'

export function useGeolocation() {
  const [location, setLocation] = useState(null)
  const [address, setAddress] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      console.log('🌍 Starting geolocation request...')
      setLoading(true)
      setError(null)

      // Check if geolocation is supported
      if (!navigator.geolocation) {
        const err = 'Geolocation is not supported by your browser'
        console.error('❌ Geolocation error:', err)
        setError(err)
        setLoading(false)
        reject(new Error(err))
        return
      }

      console.log('📍 Requesting position...')
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('✅ Position received:', position)
          
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
          
          console.log('📍 Coordinates:', coords)
          setLocation(coords)
          
          // Try to get address (reverse geocoding)
          try {
            console.log('🔍 Attempting reverse geocoding...')
            const addr = await reverseGeocode(coords.latitude, coords.longitude)
            console.log('📫 Address found:', addr)
            setAddress(addr)
            coords.address = addr
          } catch (e) {
            console.log('⚠️ Could not get address:', e.message)
            // Still resolve even without address
          }
          
          setLoading(false)
          resolve(coords)
        },
        (err) => {
          console.error('❌ Geolocation error:', err)
          
          let errorMessage = 'Unable to get location'
          
          switch (err.code) {
            case 1: // PERMISSION_DENIED
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.'
              break
            case 2: // POSITION_UNAVAILABLE
              errorMessage = 'Location information unavailable. Please try again.'
              break
            case 3: // TIMEOUT
              errorMessage = 'Location request timed out. Please try again.'
              break
            default:
              errorMessage = `Location error: ${err.message}`
          }
          
          console.error('❌ Error message:', errorMessage)
          setError(errorMessage)
          setLoading(false)
          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      )
    })
  }, [])

  const clearLocation = useCallback(() => {
    console.log('🗑️ Clearing location')
    setLocation(null)
    setAddress(null)
    setError(null)
  }, [])

  const isSupported = typeof window !== 'undefined' && 'geolocation' in navigator

  return {
    location,
    address,
    loading,
    error,
    getLocation,
    clearLocation,
    isSupported
  }
}

// Free reverse geocoding using OpenStreetMap Nominatim
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    console.log('🌐 Fetching address from:', url)
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AttendanceMonitor/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('📍 Geocoding response:', data)
    
    if (data.error) {
      throw new Error(data.error)
    }
    
    // Build a readable address
    const addr = data.address || {}
    const parts = []
    
    if (addr.road || addr.street) parts.push(addr.road || addr.street)
    if (addr.suburb || addr.neighbourhood || addr.locality) {
      parts.push(addr.suburb || addr.neighbourhood || addr.locality)
    }
    if (addr.city || addr.town || addr.village || addr.municipality) {
      parts.push(addr.city || addr.town || addr.village || addr.municipality)
    }
    if (addr.state || addr.state_district) parts.push(addr.state || addr.state_district)
    
    const formattedAddress = parts.length > 0 ? parts.join(', ') : data.display_name
    console.log('📫 Formatted address:', formattedAddress)
    
    return formattedAddress
  } catch (error) {
    console.error('❌ Reverse geocoding error:', error)
    return null
  }
}