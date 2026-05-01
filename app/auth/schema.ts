import z from 'zod'

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export const loginSchema = z.object({
  username: z.string().min(1, 'Please enter your username'),
  password: z.string().min(1, 'Please enter your password'),
})

export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  firstname: z.string(),
  lastname: z.string(),
  phone: z.string(),
  countryCode: z.string(),
  gender: z.enum(Gender),
  blocked: z.boolean(),
})
