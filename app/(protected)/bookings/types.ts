import type { z } from 'zod'
import type {
  customerStepSchema,
  createBookingSchema,
  updateBookingSchema,
  specialRequestSchema,
  waypointInputSchema,
  TripType,
  FlightType,
  BookingStatus,
  PaymentStatus,
  PaymentMode,
  CustomerType,
  BookingSource,
  WaypointType,
  VehicleChargeType,
} from './schema'
import type { BookingVehicleStatus } from '../fleet/vehicles/schema'

export type TCustomerStep = z.infer<typeof customerStepSchema>
export type TWaypointInput = z.infer<typeof waypointInputSchema>
export type TSpecialRequest = z.infer<typeof specialRequestSchema>
export type TSpecialRequestPayload = TSpecialRequest
export type TCreateBooking = z.infer<typeof createBookingSchema>
export type TUpdateBooking = z.infer<typeof updateBookingSchema>

export type { CustomerBrief as TCustomer } from '../customers/types'

export type TPlaceSuggestion = {
  placeId: string
  mainText: string
  secondaryText?: string
  latitude?: number
  longitude?: number
}

export type THourlyPackageCategoryPricing = {
  categoryId: number
  categoryName: string
  basePrice: number
}

export type THourlyPackage = {
  packageId: number
  hours: number
  km: number
  vehicleCategoryPricing: THourlyPackageCategoryPricing[]
}

export type TWaypoint = {
  id: number
  type: WaypointType
  latitude: number
  longitude: number
  address: string
}

export type TAdditionalCharges = {
  mcFare?: number
  waitingCharge?: number
  parkingCharge?: number
}

export type TBookingMetadata = {
  customerName: string
  customerContact: string
  customerType: CustomerType
  remarks?: string
  flightType?: FlightType | null
  flightNo?: string | null
}

export type TBookingHourlyPackage = {
  packageId: number
  hourlyPackageDetails: { hours: number; km: number }
}

export type TBooking = {
  id: number
  bookingReference: string
  bookingDate: string
  bookingConfirmationDate: string | null
  status: BookingStatus
  customerId: number | null
  metadata: TBookingMetadata
  tripType: TripType
  rideDate: string | null
  pickupTime: string | null
  bookingSource: BookingSource
  hourlyPackage?: TBookingHourlyPackage | null
  kmRide: number | null
  estimatedFare: number | null
  actualFare: number | null
  additionalCharges: TAdditionalCharges | null
  totalAdditionalChargesOfVehicles: number | null
  totalFare: number | null
  advanceAmount: number | null
  balanceAmount: number | null
  paymentMode: PaymentMode | null
  paymentStatus: PaymentStatus
  specialRequest: TSpecialRequestPayload | null
  waypoints: TWaypoint[]
}

export type TBookingListResponse = {
  data: TBooking[]
  pageNo: number
  pageSize: number
  pages: number
  total: number
}

export type TVehicleCharge = {
  type: VehicleChargeType
  amount: number
}

export type TBookingVehicleAdditionalCharges = {
  mcFare: number
  waitingCharge: number
  parkingCharge: number
}

export type TBookingVehicleMetadata = {
  categoryName: string
  chauffeurName?: string
  chauffeurContact?: string
  vehicleBrand?: string
  vehicleModel?: string
  totalWaitingSeconds: number
  pickupAddress: string
  customerName: string
  customerPhone: string
  specialRequest?: TSpecialRequestPayload
}

export type TBookingVehicle = {
  id: number
  bookingId: number | null
  vehicleCategoryId: number | null
  vehicleId: number | null
  chauffeurId: number | null
  vehicleNumber: string | null
  rideDate: string | null
  pickupTime: string | null
  status: BookingVehicleStatus
  baseFare: number
  actualFare: number
  advanceAmount: number
  balanceAmount: number
  additionalCharges: TBookingVehicleAdditionalCharges
  totalAdditionalAmount: number
  metadata: TBookingVehicleMetadata
}
