import * as React from 'react'

const MOBILE_BREAKPOINT = 768

function subscribeToMediaQuery(callback: () => void): () => void {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getMobileSnapshot(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot(): boolean {
  return false
}

export function useIsMobile(): boolean {
  return React.useSyncExternalStore(
    subscribeToMediaQuery,
    getMobileSnapshot,
    getServerSnapshot
  )
}
