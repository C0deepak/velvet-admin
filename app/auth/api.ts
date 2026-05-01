import { api } from '@/lib/axios'
import type { AxiosResponse } from '@/lib/axios'
import type { TLoginSchema, TUser } from '@/app/auth/types'

interface LoginResponse {
  authToken: string
  user: TUser
}

export const login = async (data: TLoginSchema): Promise<AxiosResponse<LoginResponse>> => {
  return api.post<LoginResponse>('users/admins/auth/password/login', data)
}

export const getProfile = async (): Promise<AxiosResponse<TUser>> => {
  return api.get<TUser>('users/admins/profile')
}

export const logout = async (): Promise<AxiosResponse<void>> => {
  return api.post('users/admins/auth/logout')
}
