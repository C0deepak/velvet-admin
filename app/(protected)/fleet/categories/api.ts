import { api, AxiosResponse } from '@/lib/axios'
import type { TCategory, TCategoryCreateBody, TCategoryPatch } from './types'
import type { TVehicle } from '../vehicles/types'

export function getCategories(): Promise<AxiosResponse<TCategory[]>> {
  return api.get<TCategory[]>('/fleet/categories')
}

export function getCategoryById(id: number): Promise<AxiosResponse<TCategory>> {
  return api.get<TCategory>(`/fleet/categories/${id}`)
}

export function createCategory(data: TCategoryCreateBody): Promise<AxiosResponse<TCategory>> {
  return api.post<TCategory>('/fleet/categories', data)
}

export function updateCategory(
  id: number,
  data: TCategoryPatch
): Promise<AxiosResponse<TCategory>> {
  return api.put<TCategory>(`/fleet/categories/${id}`, data)
}

export function toggleCategoryStatus(id: number): Promise<AxiosResponse<TCategory>> {
  return api.patch<TCategory>(`/fleet/categories/${id}/toggle-status`)
}

export function getCategoryVehicles(id: number): Promise<AxiosResponse<TVehicle[]>> {
  return api.get<TVehicle[]>(`/fleet/categories/${id}/vehicles`)
}

export async function uploadCategoryImageFile(file: File): Promise<string> {
  const { data } = await api.get<{ presignedUrl: string; fileUrl: string }>(
    '/utils/upload/presigned-url',
    { params: { subDirectory: 'VEHICLE_CATEGORY', fileName: file.name } }
  )
  await fetch(data.presignedUrl, {
    method: 'PUT',
    body: file,
  })
  return data.fileUrl
}
