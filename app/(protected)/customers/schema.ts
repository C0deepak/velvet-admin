import { z } from 'zod'
import { CustomerType, customerStepSchema } from '../bookings/schema'

export const customerBriefSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  profilePic: z.string().nullable(),
  bio: z.string().nullable(),
  city: z.string().nullable(),
})

export const customerMetadataSchema = z.object({
  numberOfRides: z.number(),
  customerType: z.enum(CustomerType),
})

export const customerEntitySchema = z.object({
  id: z.number(),
  countryCode: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  gender: z.string().nullable(),
  blocked: z.boolean(),
  name: z.string().nullable(),
  profilePic: z.string().nullable(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  referralCode: z.string().nullable(),
  metadata: customerMetadataSchema,
})

export const customersPaginatedResponseSchema = z.object({
  pageNo: z.number(),
  pageSize: z.number(),
  pages: z.number(),
  total: z.number(),
  data: z.array(customerEntitySchema),
})

export const customerCreateBodySchema = z.object({
  countryCode: z.string().min(1),
  phone: z.string().min(1),
  name: z.string().min(1),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  gender: z.string().optional(),
})

export const customerUpdateBodySchema = customerCreateBodySchema

export const findOrCreateCustomerBodySchema = customerStepSchema
