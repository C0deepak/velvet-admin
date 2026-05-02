import { z } from 'zod'

export const vehicleCategoryPricingRowSchema = z.object({
  categoryId: z.number().int(),
  categoryName: z.string().min(1),
  basePrice: z.number().min(0),
})

export const hourlyPackageEntitySchema = z.object({
  packageId: z.number().int(),
  hours: z.number().int().min(1),
  km: z.number().min(0),
  vehicleCategoryPricing: z.array(vehicleCategoryPricingRowSchema),
})

export const hourlyPackageWriteSchema = z.object({
  hours: z.number().int().min(1, 'Hours must be at least 1'),
  km: z.number().min(0, 'Km must be 0 or more'),
  vehicleCategoryPricing: z.array(vehicleCategoryPricingRowSchema),
})

export type TVehicleCategoryPricingRow = z.infer<typeof vehicleCategoryPricingRowSchema>
export type THourlyPackage = z.infer<typeof hourlyPackageEntitySchema>
export type THourlyPackageWrite = z.infer<typeof hourlyPackageWriteSchema>
