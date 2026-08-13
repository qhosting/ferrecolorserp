'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export type DeviceMode = 'desktop' | 'pwa' | 'mobile'

interface DeviceModeContextType {
  mode: DeviceMode
  setMode: (mode: DeviceMode) => void
  isMobile: boolean
  isDesktop: boolean
  isPWA: boolean
  isStandalone: boolean
}

const DeviceModeContext = createContext<DeviceModeContextType>({
  mode: 'desktop',
  setMode: () => {},
  isMobile: false,
  isDesktop: true,
  isPWA: false,
  isStandalone: false,
})

export function DeviceModeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [mode, setModeState] = useState<DeviceMode>('desktop')
  const [isStandalone, setIsStandalone] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    
    // Detect PWA standalone mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      setIsStandalone(isStandaloneMode)
      return isStandaloneMode
    }

    const standalone = checkStandalone()
    
    // Saved mode in localStorage
    const savedMode = localStorage.getItem('ferrecolors_device_mode') as DeviceMode | null

    if (savedMode && ['desktop', 'pwa', 'mobile'].includes(savedMode)) {
      setModeState(savedMode)
      return
    }

    // Role-based default
    const role = (session?.user as any)?.role as string | undefined
    if (role === 'GESTOR' || role === 'COBRADOR' || role === 'VENDEDOR_CAMPO') {
      setModeState('mobile')
      return
    }

    // Screen size-based default
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setModeState(standalone ? 'pwa' : 'mobile')
      } else {
        setModeState('desktop')
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [session?.user?.role])

  const setMode = (newMode: DeviceMode) => {
    setModeState(newMode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('ferrecolors_device_mode', newMode)
    }
  }

  const isMobile = mode === 'mobile' || (isMounted && mode !== 'desktop' && window.innerWidth < 768)
  const isDesktop = mode === 'desktop' && (!isMounted || window.innerWidth >= 768)
  const isPWA = mode === 'pwa' || isStandalone

  return (
    <DeviceModeContext.Provider
      value={{
        mode,
        setMode,
        isMobile,
        isDesktop,
        isPWA,
        isStandalone,
      }}
    >
      {children}
    </DeviceModeContext.Provider>
  )
}

export function useDeviceMode() {
  return useContext(DeviceModeContext)
}
