import { api, AxiosResponse } from '@/lib/axios'
import type { TChauffeur, TChauffeurListResponse, TChauffeurPayload } from './types'

export function getChauffeurs(
  pageNo = 1,
  pageSize = 100
): Promise<AxiosResponse<TChauffeurListResponse>> {
  return api.get<TChauffeurListResponse>('/users/chauffeurs', {
    params: { pageNo, pageSize },
  })
}

export function getChauffeurById(id: number): Promise<AxiosResponse<TChauffeur>> {
  return api.get<TChauffeur>(`/users/chauffeurs/${id}`)
}

export function createChauffeur(data: TChauffeurPayload): Promise<AxiosResponse<TChauffeur>> {
  return api.post<TChauffeur>('/users/chauffeurs', data)
}

export function updateChauffeur(
  id: number,
  data: TChauffeurPayload
): Promise<AxiosResponse<TChauffeur>> {
  return api.put<TChauffeur>(`/users/chauffeurs/${id}`, data)
}

export function toggleBlockChauffeur(id: number): Promise<AxiosResponse<void>> {
  return api.post<void>(`/users/chauffeurs/${id}/toggle-block`)
}

export async function uploadChauffeurFile(file: File): Promise<string> {
  const { data } = await api.get<{ presignedUrl: string; fileUrl: string }>(
    '/utils/upload/presigned-url',
    { params: { subDirectory: 'CHAUFFEUR', fileName: file.name } }
  )
  await fetch(data.presignedUrl, {
    method: 'PUT',
    body: file,
  })
  return data.fileUrl
}
