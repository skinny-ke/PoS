'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { usePOSStore } from '@/stores/posStore'

export function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const { setOnlineStatus } = usePOSStore()

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)
      setOnlineStatus(online)
    }

    // Set initial status
    updateOnlineStatus()

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [setOnlineStatus])

  if (isOnline) {
    return null
  }

  return (
    <div className="offline-indicator">
      <div className="flex items-center justify-center space-x-2">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">Offline Mode - Changes will sync when connection is restored</span>
      </div>
    </div>
  )
}