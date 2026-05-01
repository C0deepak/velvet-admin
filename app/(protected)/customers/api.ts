import { api, AxiosResponse } from '@/lib/axios'
import type {
  Customer,
  CustomerBrief,
  CustomersPaginatedResponse,
  CustomerCreateBody,
  CustomerUpdateBody,
  FindOrCreateCustomerBody,
} from './types'

export function toApiPhoneDigits(phone: string): string {
  const trimmed = phone.replace(/\D/g, '')
  if (!trimmed) return trimmed
  if (trimmed.startsWith('91') && trimmed.length >= 12) return trimmed
  return `91${trimmed}`
}

export function getCustomersPaginated(params?: {
  pageNo?: number
  pageSize?: number
  phone?: string
}): Promise<AxiosResponse<CustomersPaginatedResponse>> {
  return api.get<CustomersPaginatedResponse>('/users/customers/paginated', { params })
}

export function getCustomerById(customerId: number): Promise<AxiosResponse<Customer>> {
  return api.get<Customer>(`/users/customers/${customerId}`)
}

export function getCustomerByPhone(phoneNationalOrFull: string): Promise<AxiosResponse<Customer>> {
  const full = toApiPhoneDigits(phoneNationalOrFull)
  return api.get<Customer>(`/users/customers/phone/${full}`)
}

export function findOrCreateCustomer(
  data: FindOrCreateCustomerBody
): Promise<AxiosResponse<CustomerBrief>> {
  return api.post<CustomerBrief>('/users/customers/find-or-create', data)
}

export function updateCustomerName(
  id: number,
  name: string
): Promise<AxiosResponse<CustomerBrief>> {
  return api.patch<CustomerBrief>(`/users/customers/${id}/name`, null, {
    params: { name },
  })
}

export function createCustomer(data: CustomerCreateBody): Promise<AxiosResponse<Customer>> {
  return api.post<Customer>('/users/customers', data)
}

export function updateCustomer(
  customerId: number,
  data: CustomerUpdateBody
): Promise<AxiosResponse<Customer>> {
  return api.put<Customer>(`/users/customers/${customerId}`, data)
}
