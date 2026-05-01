import axios, {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios'
import { storage } from '@/lib/storage'
import { aesDecoder, aesEncoder } from '@/helper/api-encrypt-decrypt'
const TOKEN_KEY = 'auth_token'

const ENCRYPTION_ENABLED = process.env.NEXT_PUBLIC_ENCRYPTION_FLAG === 'true'

const ENCRYPTED_ROUTES = ['/orders/', '/payments/']

const shouldEncrypt = (url: string): boolean => {
  if (!ENCRYPTION_ENABLED || !url) return false
  return ENCRYPTED_ROUTES.some((route) => url.startsWith(route))
}

const isEncryptedResponse = (data: unknown): data is { data: string } => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    typeof (data as { data: unknown }).data === 'string'
  )
}

const getBaseURL = (): string => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || '/api'
  }
  return process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '/api'
}

const createAxiosInstance = (config?: AxiosRequestConfig): AxiosInstance => {
  const instance = axios.create({
    baseURL: getBaseURL(),
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
    ...config,
  })

  return instance
}

const encryptRequestData = (data: unknown): unknown => {
  try {
    const plaintext = JSON.stringify(data)
    const encrypted = aesEncoder(plaintext)
    return { data: encrypted }
  } catch (error) {
    console.error('Encryption error:', error)
    throw error
  }
}

const setupRequestInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = storage.get<string>(TOKEN_KEY)

      if (token && config.headers) {
        config.headers['auth-key'] = token
      }

      if (config.data instanceof FormData) {
        delete config.headers?.['Content-Type']
      }

      if (
        shouldEncrypt(config.url || '') &&
        config.data &&
        typeof config.data === 'object' &&
        !(config.data instanceof FormData)
      ) {
        config.data = encryptRequestData(config.data)
      }

      return config
    },
    (error: AxiosError) => {
      return Promise.reject(error)
    }
  )
}

const decryptResponseData = (encryptedData: string): unknown => {
  try {
    const decrypted = aesDecoder(encryptedData)
    return JSON.parse(decrypted)
  } catch (error) {
    console.error('Decryption error:', error)
    throw error
  }
}

const setupResponseInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.response.use(
    (response) => {
      if (shouldEncrypt(response.config.url || '') && isEncryptedResponse(response.data)) {
        response.data = decryptResponseData(response.data.data)
      }

      return response
    },
    (error: AxiosError) => {
      if (
        error.response &&
        shouldEncrypt(error.config?.url || '') &&
        isEncryptedResponse(error.response.data)
      ) {
        try {
          error.response.data = decryptResponseData(error.response.data.data)
        } catch (decryptError) {
          console.error('Error response decryption error:', decryptError)
        }
      }

      if (error.response?.status === 401) {
        clearAuth()

        if (typeof window !== 'undefined') {
          window.location.href = '/auth'
        }
      }

      if (!error.response) {
        console.error('Network error:', error.message)
      }

      return Promise.reject(error)
    }
  )
}

export const api = createAxiosInstance()
setupRequestInterceptor(api)
setupResponseInterceptor(api)

export type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

export const updateAuthToken = (token: string): void => {
  storage.set(TOKEN_KEY, token)
}

export const clearAuth = (): void => {
  storage.remove(TOKEN_KEY)
}
