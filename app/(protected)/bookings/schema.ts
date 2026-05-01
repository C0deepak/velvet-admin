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

export const customerStepSchema = z.object({
  countryCode: z.string().min(1, 'Country code is required'),
  phone: z.string().min(6, 'Valid phone number is required'),
})

export const waypointInputSchema = z.object({
  type: z.enum(WaypointType),
  address: z.string().min(1, 'Address is required'),
  placeId: z.string().min(1, 'Place ID is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
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
  tripType: z.enum(TripType),
  rideDate: z.string().min(1, 'Ride date is required'),
  pickupTime: z.string().min(1, 'Pickup time is required'),
  flightNo: z.string().optional(),
  flightType: z.enum(FlightType).optional(),
  hourlyPackageId: z.number().optional(),
  waypoints: z.array(waypointInputSchema).min(1),
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
