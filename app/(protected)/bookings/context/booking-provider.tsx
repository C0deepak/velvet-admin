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
import { getBookings, submitBooking } from '../api'
import { getApiErrorMessage } from '@/helper/api-error-message'
import type { TBooking } from '../types'
import { BookingStatus } from '../schema'

const PAGE_SIZE = 20

type TActiveStatus = BookingStatus | 'ALL'

type TBookingState = {
  bookings: TBooking[]
  isLoading: boolean
  error: string | null
  activeStatus: TActiveStatus
  page: number
  totalPages: number
  total: number
}

type TBookingContextValue = TBookingState & {
  fetchBookings: (status?: TActiveStatus, page?: number) => Promise<void>
  setStatus: (status: TActiveStatus) => void
  setPage: (page: number) => void
  submitBookingById: (id: number) => Promise<void>
}

const BookingContext = createContext<TBookingContextValue | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TBookingState>({
    bookings: [],
    isLoading: false,
    error: null,
    activeStatus: 'ALL',
    page: 1,
    totalPages: 1,
    total: 0,
  })

  const fetchBookings = useCallback(async (status?: TActiveStatus, page = 1) => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await getBookings({
        status: status && status !== 'ALL' ? status : undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      setState((s) => ({
        ...s,
        bookings: data.data,
        isLoading: false,
        page: data.pageNo,
        totalPages: data.pages,
        total: data.total,
      }))
    } catch (err) {
      setState((s) => ({ ...s, isLoading: false, error: getApiErrorMessage(err) }))
    }
  }, [])

  const setStatus = useCallback(
    (status: TActiveStatus) => {
      setState((s) => ({ ...s, activeStatus: status, page: 1 }))
      fetchBookings(status, 1)
    },
    [fetchBookings]
  )

  const setPage = useCallback(
    (page: number) => {
      setState((s) => {
        fetchBookings(s.activeStatus, page)
        return { ...s, page }
      })
    },
    [fetchBookings]
  )

  const submitBookingById = useCallback(async (id: number) => {
    await submitBooking(id)
    setState((s) => ({
      ...s,
      bookings: s.bookings.map((b) =>
        b.id === id ? { ...b, status: BookingStatus.REQUESTED } : b
      ),
    }))
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const value = useMemo<TBookingContextValue>(
    () => ({ ...state, fetchBookings, setStatus, setPage, submitBookingById }),
    [state, fetchBookings, setStatus, setPage, submitBookingById]
  )

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export function useBooking(): TBookingContextValue {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used within BookingProvider')
  return ctx
}

export { PAGE_SIZE }
