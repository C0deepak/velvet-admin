import * as React from 'react'

const MOBILE_BREAKPOINT = 768

function subscribeMq(onChange: () => void) {
  const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function isMobileMq(): boolean {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
}

export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribeMq, isMobileMq, () => false)
}
