import type { z } from 'zod'
import type { loginSchema, userSchema } from './schema'

export type TLoginSchema = z.infer<typeof loginSchema>
export type TUser = z.infer<typeof userSchema>
