import type { z } from 'zod'
import {
  customerBriefSchema,
  customerCreateBodySchema,
  customerEntitySchema,
  customerUpdateBodySchema,
  customersPaginatedResponseSchema,
  findOrCreateCustomerBodySchema,
} from './schema'

export type Customer = z.infer<typeof customerEntitySchema>
export type CustomerBrief = z.infer<typeof customerBriefSchema>
export type CustomersPaginatedResponse = z.infer<typeof customersPaginatedResponseSchema>
export type CustomerCreateBody = z.infer<typeof customerCreateBodySchema>
export type CustomerUpdateBody = z.infer<typeof customerUpdateBodySchema>
export type FindOrCreateCustomerBody = z.infer<typeof findOrCreateCustomerBodySchema>
