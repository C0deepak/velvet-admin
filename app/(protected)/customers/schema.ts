import { z } from 'zod'
import { CustomerType, customerStepSchema, tenDigitNationalPhoneSchema } from '../bookings/schema'

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
  customerType: z.enum(CustomerType, { error: 'Customer type is invalid' }),
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

export const CUSTOMER_FORM_GENDER = ['MALE', 'FEMALE'] as const

export const customerCreateBodySchema = z.object({
  countryCode: z.string().trim().min(1, 'Enter a country code'),
  phone: tenDigitNationalPhoneSchema,
  name: z.string().trim().min(1, 'Enter the customer’s name'),
  email: z.union([z.email('Enter a valid email address'), z.literal('')]).optional(),
  gender: z.enum(CUSTOMER_FORM_GENDER, { error: 'Please select a gender' }),
})

export const customerUpdateBodySchema = customerCreateBodySchema

export const findOrCreateCustomerBodySchema = customerStepSchema
