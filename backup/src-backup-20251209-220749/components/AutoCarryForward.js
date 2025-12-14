'use client'

import { useEffect } from 'react'

export default function AutoCarryForward({ onCarryForward }) {
  useEffect(() => {
    const checkAndCarryForward = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      
      // Run at 11:59 PM (23:59)
      if (hours === 23 && minutes === 59) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // Check if we already carried forward today
        const lastCarryForward = localStorage.getItem('lastCarryForward')
        const todayStr = today.toISOString().split('T')[0]
        
        if (lastCarryForward !== todayStr) {
          onCarryForward(today)
          localStorage.setItem('lastCarryForward', todayStr)
        }
      }
    }
    
    // Check every minute
    const interval = setInterval(checkAndCarryForward, 60000)
    
    return () => clearInterval(interval)
  }, [onCarryForward])
  
  return null // This component doesn't render anything
}