const STORAGE_PREFIX = 'velvet_admin_'

export const storage = {
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    try {
      const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
      return item ? (JSON.parse(item) as T) : null
    } catch (error) {
      console.error(`Error getting storage item ${key}:`, error)
      return null
    }
  },

  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value))
    } catch (error) {
      console.error(`Error setting storage item ${key}:`, error)
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
    } catch (error) {
      console.error(`Error removing storage item ${key}:`, error)
    }
  },

  clear(): void {
    if (typeof window === 'undefined') return
    try {
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Error clearing storage:', error)
    }
  },
}
