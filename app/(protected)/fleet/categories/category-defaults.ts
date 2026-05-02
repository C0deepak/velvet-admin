import type {
  CategoryMetadata,
  CategoryMetadataForm,
  TCategory,
  TCategoryFormValues,
} from './types'

export function emptyCategoryMetadataForm(): CategoryMetadataForm {
  return {
    waitingTimeConfig: {
      freeMinutes: null,
      chargeableIntervalMinutes: null,
      chargePerInterval: null,
    },
    hourlyPackage: {
      additionalFreeKms: null,
      additionalChargePerKm: null,
      additionalFreeMinutes: null,
      additionalChargePerInterval: null,
      additionalChargeableIntervalMinutes: null,
    },
  }
}

export function apiMetadataToForm(m: CategoryMetadata | null | undefined): CategoryMetadataForm {
  const blank = emptyCategoryMetadataForm()
  const w = m?.waitingTimeConfig
  const h = m?.hourlyPackage
  return {
    waitingTimeConfig: {
      freeMinutes: w?.freeMinutes ?? blank.waitingTimeConfig.freeMinutes,
      chargeableIntervalMinutes:
        w?.chargeableIntervalMinutes ?? blank.waitingTimeConfig.chargeableIntervalMinutes,
      chargePerInterval: w?.chargePerInterval ?? blank.waitingTimeConfig.chargePerInterval,
    },
    hourlyPackage: {
      additionalFreeKms: h?.additionalFreeKms ?? blank.hourlyPackage.additionalFreeKms,
      additionalChargePerKm: h?.additionalChargePerKm ?? blank.hourlyPackage.additionalChargePerKm,
      additionalFreeMinutes: h?.additionalFreeMinutes ?? blank.hourlyPackage.additionalFreeMinutes,
      additionalChargePerInterval:
        h?.additionalChargePerInterval ?? blank.hourlyPackage.additionalChargePerInterval,
      additionalChargeableIntervalMinutes:
        h?.additionalChargeableIntervalMinutes ??
        blank.hourlyPackage.additionalChargeableIntervalMinutes,
    },
  }
}

export function defaultCategoryFormValues(): TCategoryFormValues {
  return {
    categoryName: '',
    basePrice: 0,
    active: 1,
    imageUrl: null,
    metadata: emptyCategoryMetadataForm(),
  }
}

export function categoryToForm(c: TCategory): TCategoryFormValues {
  return {
    categoryName: c.categoryName,
    basePrice: c.basePrice,
    active: c.active,
    imageUrl: c.imageUrl ?? null,
    metadata: apiMetadataToForm(c.metadata),
  }
}
