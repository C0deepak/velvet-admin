import { api, AxiosResponse } from '@/lib/axios'
import type {
  TBooking,
  TBookingListResponse,
  TCreateBooking,
  TUpdateBooking,
  TBookingVehicle,
  TVehicleCharge,
  TPlaceSuggestion,
  THourlyPackage,
  TWaypointInput,
} from './types'

export function searchPlaces(
  query: string,
  location = '28.54998,77.18908',
  radius = 50000
): Promise<AxiosResponse<{ suggestions: TPlaceSuggestion[] }>> {
  return api.get<{ suggestions: TPlaceSuggestion[] }>('/utils/google/places/search', {
    params: { query, location, radius },
  })
}

export function createBooking(data: TCreateBooking): Promise<AxiosResponse<TBooking>> {
  return api.post<TBooking>('/bookings/createOrUpdate', data)
}

export function updateBooking(
  bookingId: number,
  data: TUpdateBooking
): Promise<AxiosResponse<TBooking>> {
  return api.put<TBooking>(`/admin/bookings/${bookingId}`, data)
}

export function getBookings(params?: {
  status?: string
  customerId?: number
  pageNo?: number
  pageSize?: number
}): Promise<AxiosResponse<TBookingListResponse>> {
  return api.get<TBookingListResponse>('/bookings', { params })
}

export function getBookingById(id: number): Promise<AxiosResponse<TBooking>> {
  return api.get<TBooking>(`/bookings/${id}`)
}

export function submitBooking(id: number): Promise<AxiosResponse<void>> {
  return api.post<void>(`/bookings/${id}/submit`)
}

export function confirmBooking(id: number): Promise<AxiosResponse<void>> {
  return api.post<void>(`/bookings/${id}/confirm`)
}

export function cancelBooking(bookingId: number): Promise<AxiosResponse<void>> {
  return api.post<void>(`/bookings/admin/${bookingId}/cancel`)
}

export function updatePaymentStatus(
  bookingId: number,
  paymentStatus: 'PENDING' | 'PAID'
): Promise<AxiosResponse<void>> {
  return api.put<void>(`/bookings/admin/${bookingId}/payment-status`, null, {
    params: { paymentStatus },
  })
}

export function getBeverages(): Promise<AxiosResponse<string[]>> {
  return api.get<string[]>('/bookings/beverages')
}

export function getHourlyPackages(): Promise<AxiosResponse<THourlyPackage[]>> {
  return api.get<THourlyPackage[]>('/hourly-packages')
}

// Waypoints
export function updateWaypoints(
  bookingId: number,
  waypoints: TWaypointInput[]
): Promise<AxiosResponse<void>> {
  return api.put<void>(`/bookings/${bookingId}/waypoints`, waypoints)
}

// Booking vehicles
export function addOrUpdateBookingVehicle(data: {
  bookingId?: number
  id?: number
  vehicleCategoryId?: number
  vehicleId?: number
  chauffeurId?: number
}): Promise<AxiosResponse<TBookingVehicle>> {
  return api.post<TBookingVehicle>('/booking/vehicles', data)
}

export function getBookingVehicles(bookingId: number): Promise<AxiosResponse<TBookingVehicle[]>> {
  return api.get<TBookingVehicle[]>(`/booking/vehicles/${bookingId}`)
}

export function deleteBookingVehicle(bookingVehicleId: number): Promise<AxiosResponse<void>> {
  return api.delete<void>(`/booking/vehicles/${bookingVehicleId}`)
}

export function updateBookingVehicleFare(
  bookingVehicleId: number,
  data: { actualFare: number; advanceAmount: number }
): Promise<AxiosResponse<TBookingVehicle>> {
  return api.put<TBookingVehicle>(`/booking/vehicles/${bookingVehicleId}/fare`, data)
}

export function getBookingVehicleCharges(
  bookingVehicleId: number
): Promise<AxiosResponse<TVehicleCharge[]>> {
  return api.get<TVehicleCharge[]>(`/booking/vehicles/${bookingVehicleId}/charges`)
}

export function updateBookingVehicleCharges(
  bookingVehicleId: number,
  charges: TVehicleCharge[]
): Promise<AxiosResponse<TVehicleCharge[]>> {
  return api.put<TVehicleCharge[]>(`/booking/vehicles/${bookingVehicleId}/charges`, charges)
}
