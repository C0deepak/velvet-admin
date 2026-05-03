import { z } from 'zod'

export enum TripType {
  ONE_WAY = 'ONE_WAY',
  AIRPORT_TRANSFER = 'AIRPORT_TRANSFER',
  HOURLY_RENTALS = 'HOURLY_RENTALS',
}

export enum FlightType {
  ARRIVAL = 'ARRIVAL',
  DEPARTURE = 'DEPARTURE',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED_BY_ADMIN = 'CANCELLED_BY_ADMIN',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}

export enum PaymentMode {
  CASH = 'CASH',
  ONLINE = 'ONLINE',
  UPI = 'UPI',
  CARD = 'CARD',
}

export enum CustomerType {
  NORMAL = 'NORMAL',
  VIP = 'VIP',
}

export enum BookingSource {
  WEB = 'WEB',
  WALK_IN = 'WALK_IN',
}

export enum WaypointType {
  PICKUP = 'PICKUP',
  STOP = 'STOP',
  DROP = 'DROP',
}

export enum VehicleChargeType {
  MC_FARE = 'MC_FARE',
  TOLL_CHARGE = 'TOLL_CHARGE',
  PARKING_CHARGE = 'PARKING_CHARGE',
}

export enum BookingVehicleStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const tenDigitNationalPhoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((digits) => digits.length === 10, {
    message: 'Enter a valid 10-digit phone number',
  })

export const customerStepSchema = z.object({
  countryCode: z.string().trim().min(1, 'Country code is required'),
  phone: tenDigitNationalPhoneSchema,
})

export const waypointInputSchema = z.object({
  type: z.enum(WaypointType, { error: 'Select a stop type' }),
  address: z.string().min(1, 'Address is required'),
  placeId: z.string().min(1, 'Place is required — search and pick a location'),
  latitude: z
    .number({ error: 'Latitude is required' })
    .min(-90, 'Latitude must be at least −90°')
    .max(90, 'Latitude must be at most 90°'),
  longitude: z
    .number({ error: 'Longitude is required' })
    .min(-180, 'Longitude must be at least −180°')
    .max(180, 'Longitude must be at most 180°'),
})

const specialRequestPassengersSchema = z.object({
  adults: z.number().min(0),
  children: z.number().min(0),
})

const specialRequestLuggageSchema = z.object({
  large: z.number().min(0),
  medium: z.number().min(0),
  small: z.number().min(0),
})

export const specialRequestSchema = z.object({
  vehicleCategory: z.string().optional(),
  vehicle: z.string().optional(),
  numberOfVehicles: z.number().optional(),
  beverages: z.array(z.string()).optional(),
  other: z.string().optional(),
  passengers: specialRequestPassengersSchema.optional(),
  luggage: specialRequestLuggageSchema.optional(),
})

export const createBookingSchema = z.object({
  customerId: z.number({ error: 'Customer is required' }),
  customerName: z.string().optional(),
  customerContact: z.string().optional(),
  tripType: z.enum(TripType, { error: 'Please select a trip type' }),
  rideDate: z.string().min(1, 'Ride date is required'),
  pickupTime: z.string().min(1, 'Pickup time is required'),
  flightNo: z.string().optional(),
  flightType: z.enum(FlightType, { error: 'Please select flight arrival or departure' }).optional(),
  hourlyPackageId: z.number({ error: 'Please select an hourly package' }).optional(),
  waypoints: z.array(waypointInputSchema).min(1, 'Add at least one pickup or drop waypoint'),
  specialRequest: specialRequestSchema.optional(),
})

export const updateBookingSchema = z.object({
  rideDate: z.string().optional(),
  pickupTime: z.string().optional(),
  hourlyPackageId: z.number().optional(),
  metadata: z
    .object({
      flightType: z.enum(FlightType).optional(),
      flightNo: z.string().optional(),
    })
    .optional(),
  specialRequest: specialRequestSchema.optional(),
})
