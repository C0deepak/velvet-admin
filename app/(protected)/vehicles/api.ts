import { api, AxiosResponse } from '@/lib/axios'
import type { TVehicle, TVehiclePutBody, TVehicleWritable } from './types'

function normalizeVehicleList(payload: unknown): TVehicle[] {
  if (Array.isArray(payload)) return payload as TVehicle[]
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const inner = (payload as { data: unknown }).data
    if (Array.isArray(inner)) return inner as TVehicle[]
  }
  return []
}

export async function getVehicles(): Promise<AxiosResponse<TVehicle[]>> {
  const raw = await api.get<TVehicle[] | { data: TVehicle[] }>('/fleet/vehicles')
  return {
    ...raw,
    data: normalizeVehicleList(raw.data),
  } as AxiosResponse<TVehicle[]>
}

export function getVehicleById(id: number): Promise<AxiosResponse<TVehicle>> {
  return api.get<TVehicle>(`/fleet/vehicles/${id}`)
}

export function createVehicle(data: TVehicleWritable): Promise<AxiosResponse<TVehicle>> {
  return api.post<TVehicle>('/fleet/vehicles', data)
}

export function updateVehicle(id: number, data: TVehiclePutBody): Promise<AxiosResponse<TVehicle>> {
  return api.put<TVehicle>(`/fleet/vehicles/${id}`, data)
}

export function getVehiclesByCategory(categoryId: number): Promise<AxiosResponse<TVehicle[]>> {
  return api.get<TVehicle[]>(`/fleet/categories/${categoryId}/vehicles`)
}

export async function uploadVehicleImage(file: File): Promise<string> {
  const { data } = await api.get<{ presignedUrl: string; fileUrl: string }>(
    '/utils/upload/presigned-url',
    { params: { subDirectory: 'VEHICLE', fileName: file.name } }
  )
  await fetch(data.presignedUrl, {
    method: 'PUT',
    body: file,
  })
  return data.fileUrl
}
