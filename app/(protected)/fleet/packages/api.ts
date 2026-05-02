import { api, type AxiosResponse } from '@/lib/axios'
import type { THourlyPackage, THourlyPackageWrite } from './types'

function normalizeList(raw: unknown): THourlyPackage[] {
  if (Array.isArray(raw)) return raw as THourlyPackage[]
  if (
    raw &&
    typeof raw === 'object' &&
    'data' in raw &&
    Array.isArray((raw as { data: unknown }).data)
  ) {
    return (raw as { data: THourlyPackage[] }).data
  }
  return []
}

export async function getHourlyPackages(): Promise<AxiosResponse<THourlyPackage[]>> {
  const res = await api.get<unknown>('/hourly-packages')
  return { ...res, data: normalizeList(res.data) }
}

export function createHourlyPackage(
  body: THourlyPackageWrite
): Promise<AxiosResponse<THourlyPackage>> {
  return api.post<THourlyPackage>('/hourly-packages', body)
}

export function updateHourlyPackage(
  packageId: number,
  body: THourlyPackageWrite
): Promise<AxiosResponse<THourlyPackage>> {
  return api.put<THourlyPackage>(`/hourly-packages/${packageId}`, body)
}
