import z from 'zod'

export enum BookingVehicleStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  CONFIRMED = 'CONFIRMED',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum FuelType {
  PETROL = 'PETROL',
  DIESEL = 'DIESEL',
  ELECTRIC = 'ELECTRIC',
  CNG = 'CNG',
  HYBRID = 'HYBRID',
}

export enum Transmission {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL = 'MANUAL',
}

export enum TenurePolicyType {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  WEEKLY = 'WEEKLY',
  CUSTOM = 'CUSTOM',
}

export enum InsuranceCoverageType {
  COMPREHENSIVE = 'COMPREHENSIVE',
  THIRD_PARTY = 'THIRD_PARTY',
  OWN_DAMAGE = 'OWN_DAMAGE',
  THIRD_PARTY_FIRE_THEFT = 'THIRD_PARTY_FIRE_THEFT',
}

const reqField = (label: string) =>
  z.preprocess((v) => (v == null ? '' : v), z.string().min(1, `${label} is required`))

/** Empty / whitespace → null; otherwise trimmed string */
const strOrNull = z.preprocess(
  (v): string | null => {
    if (v == null || v === '') return null
    if (typeof v === 'string') {
      const t = v.trim()
      return t.length === 0 ? null : t
    }
    return null
  },
  z.union([z.string(), z.null()])
)

const numOrNull = z.preprocess(
  (val): number | null => {
    if (val === '' || val === undefined || val === null) return null
    if (typeof val === 'number' && Number.isNaN(val)) return null
    if (typeof val === 'number' && Number.isFinite(val)) return val
    const n = typeof val === 'number' ? val : Number(val)
    return Number.isFinite(n) ? n : null
  },
  z.union([z.number(), z.null()])
)

export const insuranceDetailsSchema = z.object({
  policyNumber: strOrNull.optional(),
  provider: strOrNull.optional(),
  expiryDate: strOrNull.optional(),
  premiumAmount: numOrNull.optional(),
  coverageType: z.union([z.enum(InsuranceCoverageType), z.null()]).optional(),
})

export const vehicleMetadataComplianceSchema = z.object({
  registrationExpiry: reqField('Registration expiry'),
  pucExpiry: reqField('PUC expiry'),
  avgKmPerDay: numOrNull,
  dailyFuelConsumptionLiters: numOrNull,
  insuranceDetails: insuranceDetailsSchema.nullable().optional(),
})

export const tenurePolicySchema = z.object({
  type: z.union([z.enum(TenurePolicyType), z.null()]).optional(),
  startDate: strOrNull.optional(),
  endDate: strOrNull.optional(),
  amount: numOrNull.optional(),
})

export const serviceDetailsSchema = z.object({
  lastServiceDate: strOrNull.optional(),
  nextServiceDate: strOrNull.optional(),
  lastServiceKm: numOrNull.optional(),
  serviceProvider: strOrNull.optional(),
  serviceType: strOrNull.optional(),
})

export const operationalDataSchema = z.object({
  tenurePolicy: tenurePolicySchema.nullable().optional(),
  serviceDetails: serviceDetailsSchema.nullable().optional(),
})

export const vehicleWritableSchema = z.object({
  vehicleNumber: reqField('Vehicle number'),
  categoryId: z.coerce.number().min(1, 'Category is required'),
  brand: reqField('Brand'),
  model: reqField('Model'),
  seatingCapacity: z.coerce.number().min(1, 'Seating capacity is required'),
  fuelType: z.enum(FuelType, { error: 'Please select a fuel type' }),
  transmission: z.enum(Transmission, { error: 'Please select transmission type' }),
  registrationDate: reqField('Registration date'),
  modelYear: z.coerce
    .number({ error: 'Model year is required' })
    .min(1900, 'Enter a valid model year')
    .max(new Date().getFullYear() + 1, 'Model year is too far in the future'),
  chassisNumber: reqField('Chassis number'),
  engineNumber: reqField('Engine number'),
  colour: reqField('Colour'),
  hasFastTag: z.boolean(),
  hasMcdPass: z.boolean(),
  imageUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  metadata: vehicleMetadataComplianceSchema,
  operationalData: operationalDataSchema,
})

export const vehicleFormSchema = vehicleWritableSchema.extend({
  available: z.boolean(),
})

export const vehicleEntitySchema = vehicleWritableSchema.extend({
  id: z.number(),
  available: z.boolean(),
})

export type TVehicleWritable = z.infer<typeof vehicleWritableSchema>
export type TVehicleFormValues = z.infer<typeof vehicleFormSchema>
export type TVehicle = z.infer<typeof vehicleEntitySchema>
export type TVehicleCreateBody = TVehicleWritable
export type TVehiclePutBody = TVehicleWritable & { available: boolean }
