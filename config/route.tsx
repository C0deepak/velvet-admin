'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Loader } from '@/components/ui/loader'
import { useAuth } from '@/app/auth/context/auth-provider'

export const AUTH_PATH = '/auth'
export const DEFAULT_PATH = '/'

// export enum ROUTE_TYPE {
//   PROTECTED = 'PROTECTED',
//   AUTH = 'AUTH',
//   PUBLIC = 'PUBLIC',
// }

interface RouteProps {
  type: 'protected' | 'auth' | 'public'
  children: ReactNode
}

export function Route({ type, children }: RouteProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return

    if (type === 'protected' && !isAuthenticated) {
      router.replace(AUTH_PATH)
      return
    }

    if (type === 'auth' && isAuthenticated) {
      router.replace(DEFAULT_PATH)
    }
  }, [type, isAuthenticated, isLoading, router])

  if (isLoading && (type === 'protected' || type === 'auth')) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader />
      </div>
    )
  }

  if (type === 'protected' && !isAuthenticated) {
    return null
  }

  if (type === 'auth' && isAuthenticated) {
    return null
  }

  return <>{children}</>
}
