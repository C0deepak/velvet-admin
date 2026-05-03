import { z } from 'zod'

export const numOrNull = z.preprocess(
  (val): number | null => {
    if (val === '' || val === undefined || val === null) return null
    if (typeof val === 'number' && Number.isNaN(val)) return null
    if (typeof val === 'number' && Number.isFinite(val)) return val
    const n = typeof val === 'number' ? val : Number(val)
    return Number.isFinite(n) ? n : null
  },
  z.union([z.number(), z.null()])
)

export const waitingTimeConfigSchema = z.object({
  freeMinutes: z.coerce.number().min(0, 'Must be 0 or more'),
  chargeableIntervalMinutes: z.coerce.number().min(1, 'Must be at least 1 minute'),
  chargePerInterval: z.coerce.number().min(0, 'Must be 0 or more'),
})

export const hourlyPackageMetadataSchema = z.object({
  additionalFreeKms: z.coerce.number().min(0, 'Must be 0 or more'),
  additionalChargePerKm: z.coerce.number().min(0, 'Must be 0 or more'),
  additionalFreeMinutes: z.coerce.number().min(0, 'Must be 0 or more'),
  additionalChargePerInterval: z.coerce.number().min(0, 'Must be 0 or more'),
  additionalChargeableIntervalMinutes: z.coerce.number().min(1, 'Must be at least 1 minute'),
})

export const categoryMetadataSchema = z.object({
  waitingTimeConfig: waitingTimeConfigSchema,
  hourlyPackage: hourlyPackageMetadataSchema.optional(),
})

export const waitingTimeFormSchema = z.object({
  freeMinutes: numOrNull,
  chargeableIntervalMinutes: numOrNull,
  chargePerInterval: numOrNull,
})

export const hourlyPackageFormSchema = z.object({
  additionalFreeKms: numOrNull,
  additionalChargePerKm: numOrNull,
  additionalFreeMinutes: numOrNull,
  additionalChargePerInterval: numOrNull,
  additionalChargeableIntervalMinutes: numOrNull,
})

export const categoryMetadataFormSchema = z.object({
  waitingTimeConfig: waitingTimeFormSchema,
  hourlyPackage: hourlyPackageFormSchema,
})

type ZodRefineIssueCtx = Pick<z.core.$RefinementCtx<Record<string, never>>, 'addIssue'>

function addWaitingRequiredIssues(
  w: z.infer<typeof waitingTimeFormSchema>,
  ctx: ZodRefineIssueCtx
) {
  if (w.freeMinutes == null) {
    ctx.addIssue({
      code: 'custom',
      message: 'Free minutes is required',
      path: ['metadata', 'waitingTimeConfig', 'freeMinutes'],
    })
  } else if (w.freeMinutes < 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Must be 0 or more',
      path: ['metadata', 'waitingTimeConfig', 'freeMinutes'],
    })
  }
  if (w.chargeableIntervalMinutes == null) {
    ctx.addIssue({
      code: 'custom',
      message: 'Billable interval is required',
      path: ['metadata', 'waitingTimeConfig', 'chargeableIntervalMinutes'],
    })
  } else if (w.chargeableIntervalMinutes < 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'Must be at least 1 minute',
      path: ['metadata', 'waitingTimeConfig', 'chargeableIntervalMinutes'],
    })
  }
  if (w.chargePerInterval == null) {
    ctx.addIssue({
      code: 'custom',
      message: 'Charge per interval is required',
      path: ['metadata', 'waitingTimeConfig', 'chargePerInterval'],
    })
  } else if (w.chargePerInterval < 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Must be 0 or more',
      path: ['metadata', 'waitingTimeConfig', 'chargePerInterval'],
    })
  }
}

function addHourlyRequiredIssues(
  h: z.infer<typeof hourlyPackageFormSchema>,
  ctx: ZodRefineIssueCtx
) {
  const fields: { key: keyof typeof h; label: string; min: number; int?: boolean }[] = [
    { key: 'additionalFreeKms', label: 'Additional free kms', min: 0 },
    { key: 'additionalChargePerKm', label: 'Charge per extra km', min: 0 },
    { key: 'additionalFreeMinutes', label: 'Additional free minutes', min: 0 },
    { key: 'additionalChargePerInterval', label: 'Charge per billing interval', min: 0 },
    {
      key: 'additionalChargeableIntervalMinutes',
      label: 'Billable interval (min)',
      min: 1,
      int: true,
    },
  ]
  for (const { key, label, min, int } of fields) {
    const v = h[key]
    if (v == null) {
      ctx.addIssue({
        code: 'custom',
        message: `${label} is required`,
        path: ['metadata', 'hourlyPackage', key],
      })
    } else if (v < min) {
      ctx.addIssue({
        code: 'custom',
        message: min === 1 ? 'Must be at least 1' : 'Must be 0 or more',
        path: ['metadata', 'hourlyPackage', key],
      })
    } else if (int && !Number.isInteger(v)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Use a whole number of minutes',
        path: ['metadata', 'hourlyPackage', key],
      })
    }
  }
}

export const categoryBasicsTabSchema = z
  .object({
    categoryName: z.string().min(1, 'Category name is required'),
    basePrice: z.coerce.number().min(0, 'Base price must be 0 or more'),
    active: z.coerce.number().min(0, 'Status is required').max(1, 'Invalid status'),
    imageUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    metadata: z.object({
      waitingTimeConfig: waitingTimeFormSchema,
    }),
  })
  .superRefine((data, ctx) => {
    addWaitingRequiredIssues(data.metadata.waitingTimeConfig, ctx)
  })

export const categoryHourlyTabSchema = z
  .object({
    metadata: z.object({
      hourlyPackage: hourlyPackageFormSchema,
    }),
  })
  .superRefine((data, ctx) => {
    addHourlyRequiredIssues(data.metadata.hourlyPackage, ctx)
  })

export const categoryEntitySchema = z.object({
  id: z.number(),
  categoryName: z.string(),
  basePrice: z.number(),
  active: z.number(),
  imageUrl: z.union([z.string(), z.null()]),
  metadata: categoryMetadataSchema,
})

export const categoryAdminFormSchema = z.object({
  categoryName: z.string().min(1, 'Category name is required'),
  basePrice: z.coerce.number().min(0, 'Base price must be 0 or more'),
  active: z.coerce.number().min(0, 'Status is required').max(1, 'Invalid status'),
  imageUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  metadata: categoryMetadataFormSchema,
})

export const categoryCreateBodySchema = z.object({
  categoryName: categoryEntitySchema.shape.categoryName,
  basePrice: categoryEntitySchema.shape.basePrice,
  metadata: z.object({
    waitingTimeConfig: waitingTimeConfigSchema,
    hourlyPackage: hourlyPackageMetadataSchema.optional(),
  }),
})

export const categoryPatchSchema = z.object({
  categoryName: categoryEntitySchema.shape.categoryName.optional(),
  basePrice: categoryEntitySchema.shape.basePrice.optional(),
  active: categoryEntitySchema.shape.active.optional(),
  imageUrl: categoryEntitySchema.shape.imageUrl.optional(),
  metadata: z.union([categoryMetadataSchema, categoryMetadataSchema.partial()]).optional(),
})

export type WaitingTimeConfig = z.infer<typeof waitingTimeConfigSchema>
export type HourlyPackageMetadata = z.infer<typeof hourlyPackageMetadataSchema>
export type CategoryMetadata = z.infer<typeof categoryMetadataSchema>
export type CategoryMetadataForm = z.infer<typeof categoryMetadataFormSchema>
export type TCategoryFormValues = z.infer<typeof categoryAdminFormSchema>
export type TCategory = z.infer<typeof categoryEntitySchema>
export type TCategoryCreateBody = z.infer<typeof categoryCreateBodySchema>
export type TCategoryPatch = z.infer<typeof categoryPatchSchema>
