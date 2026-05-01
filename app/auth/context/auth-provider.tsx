'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { storage } from '@/lib/storage'
import { updateAuthToken, clearAuth } from '@/lib/axios'
import { login as loginApi, logout as logoutApi, getProfile } from '@/app/auth/api'
import type { TLoginSchema, TUser } from '@/app/auth/types'
import { getApiErrorMessage } from '@/helper/api-error-message'
import { AUTH_PATH, DEFAULT_PATH } from '@/config/route'

const TOKEN_KEY = 'auth_token'

function getToken(): string | null {
  return storage.get<string>(TOKEN_KEY)
}

interface AuthState {
  user: TUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthContextValue extends AuthState {
  login: (data: TLoginSchema) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })

  const initializeAuth = useCallback(async () => {
    const token = getToken()
    console.log('Initializing auth, token:', token)
    if (!token) {
      clearAuth()
      setState({ user: null, isAuthenticated: false, isLoading: false, error: null })
      return
    }
    try {
      const { data: user } = await getProfile()
      setState({ user, isAuthenticated: true, isLoading: false, error: null })
    } catch {
      clearAuth()
      setState({ user: null, isAuthenticated: false, isLoading: false, error: null })
    }
  }, [])

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  const login = useCallback(
    async (data: TLoginSchema) => {
      setState((s) => ({ ...s, error: null, isLoading: true }))
      try {
        const { data: res } = await loginApi(data)
        updateAuthToken(res.authToken)
        setState({ user: res.user, isAuthenticated: true, isLoading: false, error: null })
        router.replace(DEFAULT_PATH)
      } catch (err) {
        setState((s) => ({ ...s, isLoading: false, error: getApiErrorMessage(err) }))
      }
    },
    [router]
  )

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } finally {
      clearAuth()
      setState({ user: null, isAuthenticated: false, isLoading: false, error: null })
      router.replace(AUTH_PATH)
    }
  }, [router])

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout, clearError }),
    [state, login, logout, clearError]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
