import { AxiosError } from 'axios'

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.'

export function getApiErrorMessage(error: unknown, fallback = DEFAULT_MESSAGE): string {
  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data as Record<string, unknown>
    const message = typeof data.message === 'string' ? data.message : null
    const dataStr = typeof data.data === 'string' ? data.data : null
    return message ?? dataStr ?? error.message ?? fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
