import { z } from 'zod'

export const vehicleCategoryPricingRowSchema = z.object({
  categoryId: z
    .number()
    .int({ error: 'Category ID is invalid' })
    .min(1, 'Choose a vehicle category'),
  categoryName: z.string().trim().min(1, 'Category name is required'),
  basePrice: z.number({ error: 'Base price is required' }).min(0, 'Base price must be 0 or more'),
})

export const hourlyPackageEntitySchema = z.object({
  packageId: z.number().int({ error: 'Package ID is invalid' }),
  hours: z.number().int({ error: 'Hours is invalid' }).min(1, 'Hours must be at least 1'),
  km: z.number({ error: 'Kilometers is invalid' }).min(0, 'Km limit must be 0 or more'),
  vehicleCategoryPricing: z.array(vehicleCategoryPricingRowSchema),
})

export const hourlyPackageWriteSchema = z.object({
  hours: z.number().int({ error: 'Hours is required' }).min(1, 'Hours must be at least 1'),
  km: z.number({ error: 'Kilometers is required' }).min(0, 'Km limit must be 0 or more'),
  vehicleCategoryPricing: z
    .array(vehicleCategoryPricingRowSchema)
    .min(1, 'Add pricing for at least one vehicle category'),
})

export type TVehicleCategoryPricingRow = z.infer<typeof vehicleCategoryPricingRowSchema>
export type THourlyPackage = z.infer<typeof hourlyPackageEntitySchema>
export type THourlyPackageWrite = z.infer<typeof hourlyPackageWriteSchema>
