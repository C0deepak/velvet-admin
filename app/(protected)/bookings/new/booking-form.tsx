'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { startOfDay } from 'date-fns'
import {
  AirplaneLandingIcon,
  AirplaneTakeoffIcon,
  AirplaneTiltIcon,
  CaretDownIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  RoadHorizonIcon,
  TrashIcon,
  UserCircleIcon,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldLabel, FieldError } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { AIRPORTS, type AirportCity } from '@/lib/airport-data'
import { FlowStepBar } from '../booking-badges'
import { AirportPicker } from '../components/airport-picker'
import { PlaceSearch, EMPTY_PLACE, isPlaceReadyForSubmit, type PlaceValue } from './place-search'
import {
  customerStepSchema,
  specialRequestSchema,
  TripType,
  FlightType,
  WaypointType,
} from '../schema'
import type {
  TCreateBooking,
  TCustomer,
  TCustomerStep,
  TSpecialRequest,
  THourlyPackage,
  TWaypointInput,
  TBooking,
} from '../types'
import { createBooking, updateBooking, getBeverages, getHourlyPackages } from '../api'
import { findOrCreateCustomer, updateCustomerName } from '../../customers/api'
import { getCategories } from '../../fleet/categories/api'
import { getVehiclesByCategory } from '../../fleet/vehicles/api'
import { getChauffeurs } from '../../chauffeurs/api'
import type { TCategory } from '../../fleet/categories/types'
import type { TVehicle } from '../../fleet/vehicles/types'
import type { TChauffeur } from '../../chauffeurs/types'
import { getApiErrorMessage } from '@/helper/api-error-message'

function placeToWp(type: WaypointType, p: PlaceValue): TWaypointInput {
  if (
    p.latitude == null ||
    p.longitude == null ||
    !Number.isFinite(p.latitude) ||
    !Number.isFinite(p.longitude)
  ) {
    throw new Error('Waypoint missing coordinates')
  }
  return {
    type,
    address: p.address,
    placeId: p.placeId,
    latitude: p.latitude,
    longitude: p.longitude,
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  )
}

function WaypointRow({
  label,
  pinColor,
  showLine,
  children,
}: {
  label: string
  pinColor: 'green' | 'amber' | 'red'
  showLine: boolean
  children: React.ReactNode
}) {
  const colorClass = { green: 'text-green-500', amber: 'text-amber-500', red: 'text-red-500' }[
    pinColor
  ]
  return (
    <div className="flex min-w-0 gap-3">
      <div className="flex flex-col items-center pt-2.5">
        <MapPinIcon className={cn('size-4 shrink-0', colorClass)} weight="fill" />
        {showLine && <div className="mt-1 w-px flex-1 bg-border" />}
      </div>
      <div className={cn('min-w-0 flex-1', showLine ? 'pb-5' : 'pb-1')}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {children}
      </div>
    </div>
  )
}

/** +/− controls only; pair with `FieldLabel` like category / vehicle selects. */
function InlineQuantityStepper({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="grid w-full grid-cols-3 gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        className="flex h-10 w-full items-center justify-center border border-border bg-transparent text-base font-semibold transition-colors hover:bg-muted disabled:opacity-40"
      >
        −
      </button>
      <span className="flex h-10 w-full items-center justify-center text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-10 w-full items-center justify-center border border-border bg-transparent text-base font-semibold transition-colors hover:bg-muted"
      >
        +
      </button>
    </div>
  )
}

function CounterRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          className="flex size-7 items-center justify-center border border-border text-sm transition-colors hover:bg-muted disabled:opacity-40"
        >
          −
        </button>
        <span className="w-4 text-center text-sm tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex size-7 items-center justify-center border border-border text-sm transition-colors hover:bg-muted"
        >
          +
        </button>
      </div>
    </div>
  )
}

function contactKeyFromValidatedStep(step: Pick<TCustomerStep, 'countryCode' | 'phone'>): string {
  return `${step.countryCode}|${step.phone}`
}

function contactKeyFromInputs(
  countryCode: string | undefined,
  rawPhone: string | undefined
): string {
  return `${(countryCode ?? '').trim()}|${(rawPhone ?? '').replace(/\D/g, '')}`
}

export function BookingForm() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const step1Form = useForm<TCustomerStep>({
    resolver: zodResolver(customerStepSchema),
    defaultValues: { countryCode: '+91', phone: '' },
  })
  const [cust, setCust] = useState({
    data: null as TCustomer | null,
    nameInput: '',
    loading: false,
    nameLoading: false,
    error: null as string | null,
  })
  const [lastFetchedContactKey, setLastFetchedContactKey] = useState<string | null>(null)
  const customerLookupEpochRef = useRef(0)

  const [sched, setSched] = useState({
    tripType: TripType.ONE_WAY,
    rideDate: '',
    pickupTime: '',
  })
  const [attemptedStep2Submit, setAttemptedStep2Submit] = useState(false)
  const [oneWay, setOneWay] = useState({
    pickup: EMPTY_PLACE,
    stops: [] as PlaceValue[],
    drop: EMPTY_PLACE,
  })
  const [apt, setApt] = useState({
    flightType: FlightType.ARRIVAL,
    city: 'Delhi' as AirportCity,
    terminalIdx: 0,
    flightNo: '',
    customer: EMPTY_PLACE,
    stops: [] as PlaceValue[],
  })
  const [hourly, setHourly] = useState({
    packages: [] as THourlyPackage[],
    packageId: null as number | null,
    pickup: EMPTY_PLACE,
  })
  const [bookingReq, setBookingReq] = useState({ loading: false, error: null as string | null })

  const [resources, setResources] = useState({
    vehicleCategories: [] as TCategory[],
    chauffeurs: [] as TChauffeur[],
    beverageOptions: [] as string[],
  })

  const srForm = useForm<TSpecialRequest>({
    resolver: zodResolver(specialRequestSchema),
    defaultValues: {
      vehicleCategory: '',
      vehicle: '',
      numberOfVehicles: 0,
      beverages: [],
      other: '',
      passengers: { adults: 0, children: 0 },
      luggage: { large: 0, medium: 0, small: 0 },
    },
  })
  const [step3, setStep3] = useState({
    createdBooking: null as TBooking | null,
    vehicles: [] as TVehicle[],
    selectedCategoryId: null as number | null,
    srOpen: true,
    loading: false,
    error: null as string | null,
  })

  useEffect(() => {
    Promise.all([getCategories(), getChauffeurs(), getBeverages()])
      .then(([cats, chauf, bevs]) => {
        setResources({
          vehicleCategories: cats.data.filter((c) => c.active === 1),
          chauffeurs: chauf.data.data,
          beverageOptions: bevs.data,
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (sched.tripType !== TripType.HOURLY_RENTALS || hourly.packages.length > 0) return
    getHourlyPackages()
      .then((r) => setHourly((s) => ({ ...s, packages: r.data })))
      .catch(() => {})
  }, [sched.tripType, hourly.packages.length])

  const watchedCountryCode = useWatch({ control: step1Form.control, name: 'countryCode' })
  const watchedPhone = useWatch({ control: step1Form.control, name: 'phone' })

  useEffect(() => {
    const typedKey = contactKeyFromInputs(watchedCountryCode, watchedPhone)
    if (cust.data == null || lastFetchedContactKey === null || typedKey === lastFetchedContactKey)
      return
    customerLookupEpochRef.current += 1
    setCust((s) => ({ ...s, data: null, nameInput: '', error: null, loading: false }))
    setLastFetchedContactKey(null)
  }, [watchedCountryCode, watchedPhone, cust.data, lastFetchedContactKey])

  async function findCustomer(data: TCustomerStep) {
    const requestEpoch = ++customerLookupEpochRef.current
    setCust((s) => ({ ...s, loading: true, error: null }))
    try {
      const { data: c } = await findOrCreateCustomer(data)
      if (customerLookupEpochRef.current !== requestEpoch) return
      const fetchedKey = contactKeyFromValidatedStep(data)
      setCust((s) => ({ ...s, data: c, nameInput: c.name ?? '', loading: false }))
      setLastFetchedContactKey(fetchedKey)
    } catch (err) {
      if (customerLookupEpochRef.current !== requestEpoch) return
      setCust((s) => ({ ...s, loading: false, error: getApiErrorMessage(err) }))
    }
  }

  async function saveName() {
    if (!cust.data || !cust.nameInput.trim()) return
    setCust((s) => ({ ...s, nameLoading: true }))
    try {
      const { data: c } = await updateCustomerName(cust.data.id, cust.nameInput.trim())
      setCust((s) => ({ ...s, data: c, nameLoading: false }))
    } catch {
      setCust((s) => ({ ...s, nameLoading: false }))
    }
  }

  function buildWaypoints(): TWaypointInput[] {
    if (sched.tripType === TripType.ONE_WAY) {
      return [
        placeToWp(WaypointType.PICKUP, oneWay.pickup),
        ...oneWay.stops.filter(isPlaceReadyForSubmit).map((s) => placeToWp(WaypointType.STOP, s)),
        placeToWp(WaypointType.DROP, oneWay.drop),
      ]
    }
    if (sched.tripType === TripType.AIRPORT_TRANSFER) {
      const t = AIRPORTS[apt.city].terminals[apt.terminalIdx]
      const airportWp: TWaypointInput = {
        type: apt.flightType === FlightType.ARRIVAL ? WaypointType.PICKUP : WaypointType.DROP,
        address: t.address,
        placeId: t.placeId,
        latitude: t.latitude,
        longitude: t.longitude,
      }
      const customerWp = placeToWp(
        apt.flightType === FlightType.ARRIVAL ? WaypointType.DROP : WaypointType.PICKUP,
        apt.customer
      )
      const stopWps = apt.stops
        .filter(isPlaceReadyForSubmit)
        .map((s) => placeToWp(WaypointType.STOP, s))
      return apt.flightType === FlightType.ARRIVAL
        ? [airportWp, ...stopWps, customerWp]
        : [customerWp, ...stopWps, airportWp]
    }
    return [placeToWp(WaypointType.PICKUP, hourly.pickup)]
  }

  function canProceed(): boolean {
    if (!sched.rideDate || !sched.pickupTime) return false
    if (sched.tripType === TripType.ONE_WAY)
      return (
        isPlaceReadyForSubmit(oneWay.pickup) &&
        isPlaceReadyForSubmit(oneWay.drop) &&
        oneWay.stops.every(isPlaceReadyForSubmit)
      )
    if (sched.tripType === TripType.AIRPORT_TRANSFER)
      return isPlaceReadyForSubmit(apt.customer) && apt.stops.every(isPlaceReadyForSubmit)
    if (sched.tripType === TripType.HOURLY_RENTALS)
      return isPlaceReadyForSubmit(hourly.pickup) && hourly.packageId !== null
    return false
  }

  async function handleCreateBooking() {
    if (!cust.data) return
    setAttemptedStep2Submit(true)
    if (!canProceed()) return
    setBookingReq({ loading: true, error: null })
    const { countryCode, phone } = step1Form.getValues()
    try {
      const payload: TCreateBooking = {
        customerId: cust.data.id,
        customerName: cust.data.name ?? cust.nameInput,
        customerContact: `${countryCode}${phone}`,
        tripType: sched.tripType,
        rideDate: sched.rideDate,
        pickupTime: sched.pickupTime.length === 5 ? `${sched.pickupTime}:00` : sched.pickupTime,
        waypoints: buildWaypoints(),
        ...(sched.tripType === TripType.AIRPORT_TRANSFER && {
          flightType: apt.flightType,
          flightNo: apt.flightNo || undefined,
        }),
        ...(sched.tripType === TripType.HOURLY_RENTALS &&
          hourly.packageId !== null && { hourlyPackageId: hourly.packageId }),
      }
      const { data } = await createBooking(payload)
      setStep3((s) => ({ ...s, createdBooking: data }))
      setBookingReq({ loading: false, error: null })
      setStep(3)
    } catch (err) {
      setBookingReq({ loading: false, error: getApiErrorMessage(err) })
    }
  }

  async function handleSaveSpecialRequest() {
    if (!step3.createdBooking) return
    setStep3((s) => ({ ...s, loading: true, error: null }))
    const vals = srForm.getValues()
    const pax = vals.passengers
    const lug = vals.luggage
    const hasPassengers = (pax?.adults ?? 0) > 0 || (pax?.children ?? 0) > 0
    const hasLuggage = (lug?.large ?? 0) > 0 || (lug?.medium ?? 0) > 0 || (lug?.small ?? 0) > 0
    const hasAny =
      vals.vehicleCategory ||
      vals.vehicle ||
      vals.numberOfVehicles ||
      (vals.beverages?.length ?? 0) > 0 ||
      vals.other ||
      hasPassengers ||
      hasLuggage
    try {
      await updateBooking(step3.createdBooking.id, {
        specialRequest: hasAny
          ? {
              vehicleCategory: vals.vehicleCategory || undefined,
              vehicle: vals.vehicle || undefined,
              numberOfVehicles: vals.numberOfVehicles || undefined,
              beverages: vals.beverages?.length ? vals.beverages : undefined,
              other: vals.other || undefined,
              ...(hasPassengers &&
                pax && {
                  passengers: { adults: pax.adults, children: pax.children },
                }),
              ...(hasLuggage &&
                lug && {
                  luggage: { large: lug.large, medium: lug.medium, small: lug.small },
                }),
            }
          : undefined,
      })
      router.push('/bookings')
    } catch (err) {
      setStep3((s) => ({ ...s, loading: false, error: getApiErrorMessage(err) }))
    }
  }

  const { countryCode, phone } = step1Form.getValues()
  const sr = srForm.watch()

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <FlowStepBar step={step} labels={['Customer', 'Booking', 'Done']} />

      {step === 1 && (
        <Card>
          <CardContent>
            <SectionTitle>Customer Lookup</SectionTitle>
            <div className="flex flex-col gap-6">
              <form onSubmit={step1Form.handleSubmit(findCustomer)} className="flex flex-col gap-5">
                <div className="flex items-end gap-3">
                  <div className="w-28">
                    <Field
                      data-invalid={!!step1Form.formState.errors.countryCode}
                      className="flex flex-col gap-1.5"
                    >
                      <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Code
                      </FieldLabel>
                      <FieldContent>
                        <InputGroup className="w-full">
                          <select
                            {...step1Form.register('countryCode')}
                            className="h-10 w-full border-b border-b-input bg-transparent py-2 text-sm text-foreground outline-none focus:border-b-ring"
                          >
                            {['+91', '+1', '+44', '+971', '+65'].map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </InputGroup>
                      </FieldContent>
                    </Field>
                  </div>

                  <div className="flex-1">
                    <Field
                      data-invalid={!!step1Form.formState.errors.phone}
                      className="flex flex-col gap-1.5"
                    >
                      <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Phone Number
                      </FieldLabel>
                      <FieldContent>
                        <InputGroup className="w-full">
                          <InputGroupAddon align="inline-start">
                            <PhoneIcon className="size-4" weight="bold" />
                          </InputGroupAddon>
                          <InputGroupInput
                            type="tel"
                            placeholder="Enter phone number"
                            aria-invalid={!!step1Form.formState.errors.phone}
                            {...step1Form.register('phone')}
                          />
                        </InputGroup>
                        <FieldError
                          errors={
                            step1Form.formState.errors.phone?.message
                              ? [{ message: step1Form.formState.errors.phone.message }]
                              : undefined
                          }
                        />
                      </FieldContent>
                    </Field>
                  </div>

                  <Button type="submit" disabled={cust.loading} className="mb-0.5 shrink-0">
                    {cust.loading ? 'Finding…' : 'Find Customer'}
                  </Button>
                </div>

                {cust.error && <p className="text-sm text-destructive">{cust.error}</p>}
              </form>

              {cust.data && (
                <div className="flex flex-col gap-4 border border-border p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center bg-muted">
                      <UserCircleIcon className="size-5 text-muted-foreground" weight="fill" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {cust.data.name ?? (
                          <span className="italic text-muted-foreground">No name set</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {countryCode} {phone}
                      </p>
                    </div>
                  </div>

                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Customer Name
                    </FieldLabel>
                    <FieldContent>
                      <div className="flex gap-2">
                        <InputGroup className="flex-1">
                          <InputGroupInput
                            value={cust.nameInput}
                            onChange={(e) => setCust((s) => ({ ...s, nameInput: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && saveName()}
                            placeholder="Enter customer name"
                          />
                        </InputGroup>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={saveName}
                          disabled={
                            !cust.nameInput.trim() ||
                            cust.nameLoading ||
                            cust.nameInput === cust.data.name
                          }
                        >
                          {cust.nameLoading ? '…' : 'Save'}
                        </Button>
                      </div>
                    </FieldContent>
                  </Field>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={!cust.data}
                  onClick={() => {
                    setAttemptedStep2Submit(false)
                    setStep(2)
                  }}
                >
                  Next →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <>
          <Card>
            <CardContent>
              <SectionTitle>Schedule</SectionTitle>
              <div className="flex flex-col gap-6">
                <div>
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Trip type
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {(
                      [
                        {
                          value: TripType.ONE_WAY,
                          label: 'One way',
                          Icon: RoadHorizonIcon,
                        },
                        {
                          value: TripType.AIRPORT_TRANSFER,
                          label: 'Airport',
                          Icon: AirplaneTiltIcon,
                        },
                        {
                          value: TripType.HOURLY_RENTALS,
                          label: 'Hourly',
                          Icon: ClockCountdownIcon,
                        },
                      ] as const
                    ).map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setAttemptedStep2Submit(false)
                          setSched((s) => ({ ...s, tripType: value }))
                        }}
                        className={cn(
                          'flex min-h-12 items-center gap-3 border px-6 py-3.5 text-sm font-semibold uppercase tracking-wider transition-colors sm:min-w-[9rem] sm:px-7 sm:py-4',
                          sched.tripType === value
                            ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/5'
                            : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        )}
                      >
                        <Icon className="size-5 shrink-0" weight="bold" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <Field
                    data-invalid={attemptedStep2Submit && !sched.rideDate}
                    className="flex flex-col gap-1.5"
                  >
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Ride Date
                    </FieldLabel>
                    <FieldContent>
                      <DatePicker
                        value={sched.rideDate}
                        minDate={startOfDay(new Date())}
                        onChange={(v) => setSched((s) => ({ ...s, rideDate: v }))}
                        error={attemptedStep2Submit && !sched.rideDate}
                      />
                    </FieldContent>
                  </Field>
                  <Field
                    data-invalid={attemptedStep2Submit && !sched.pickupTime}
                    className="flex flex-col gap-1.5"
                  >
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Pickup Time
                    </FieldLabel>
                    <FieldContent>
                      <TimePicker
                        value={sched.pickupTime}
                        onChange={(v) => setSched((s) => ({ ...s, pickupTime: v }))}
                        error={attemptedStep2Submit && !sched.pickupTime}
                      />
                    </FieldContent>
                  </Field>
                </div>
              </div>
            </CardContent>
          </Card>

          {sched.tripType === TripType.ONE_WAY && (
            <Card>
              <CardContent>
                <SectionTitle>Route</SectionTitle>

                <WaypointRow label="Pickup" pinColor="green" showLine>
                  <PlaceSearch
                    preferConfirmScreen
                    value={oneWay.pickup}
                    onChange={(v) => setOneWay((s) => ({ ...s, pickup: v }))}
                    placeholder="Search pickup address…"
                    error={attemptedStep2Submit && !isPlaceReadyForSubmit(oneWay.pickup)}
                  />
                </WaypointRow>

                {oneWay.stops.map((stop, i) => (
                  <WaypointRow key={i} label={`Stop ${i + 1}`} pinColor="amber" showLine>
                    <div className="flex min-w-0 items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <PlaceSearch
                          preferConfirmScreen
                          value={stop}
                          onChange={(v) =>
                            setOneWay((s) => ({
                              ...s,
                              stops: s.stops.map((x, idx) => (idx === i ? v : x)),
                            }))
                          }
                          placeholder={`Stop ${i + 1} address…`}
                          error={attemptedStep2Submit && !isPlaceReadyForSubmit(stop)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setOneWay((s) => ({ ...s, stops: s.stops.filter((_, idx) => idx !== i) }))
                        }
                        className="mt-2.5 shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <TrashIcon className="size-3.5" weight="bold" />
                      </button>
                    </div>
                  </WaypointRow>
                ))}

                <div className="flex gap-3">
                  <div className="flex flex-col items-center pt-2.5">
                    <div className="size-4" />
                    <div className="mt-1 w-px flex-1 bg-border" />
                  </div>
                  <div className="flex-1 pb-5">
                    <button
                      type="button"
                      onClick={() => setOneWay((s) => ({ ...s, stops: [...s.stops, EMPTY_PLACE] }))}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <PlusIcon className="size-3" weight="bold" />
                      Add stop
                    </button>
                  </div>
                </div>

                <WaypointRow label="Drop" pinColor="red" showLine={false}>
                  <PlaceSearch
                    preferConfirmScreen
                    value={oneWay.drop}
                    onChange={(v) => setOneWay((s) => ({ ...s, drop: v }))}
                    placeholder="Search drop address…"
                    error={attemptedStep2Submit && !isPlaceReadyForSubmit(oneWay.drop)}
                  />
                </WaypointRow>
              </CardContent>
            </Card>
          )}

          {sched.tripType === TripType.AIRPORT_TRANSFER && (
            <Card>
              <CardContent>
                <SectionTitle>Route</SectionTitle>

                <div className="mb-5 flex gap-2">
                  {[
                    { value: FlightType.ARRIVAL, label: 'Arrival', Icon: AirplaneLandingIcon },
                    { value: FlightType.DEPARTURE, label: 'Departure', Icon: AirplaneTakeoffIcon },
                  ].map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setAttemptedStep2Submit(false)
                        setApt((s) => ({ ...s, flightType: value }))
                      }}
                      className={cn(
                        'flex items-center gap-2 border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                        apt.flightType === value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )}
                    >
                      <Icon className="size-3.5" />
                      {label}
                    </button>
                  ))}
                </div>

                {apt.flightType === FlightType.ARRIVAL ? (
                  <>
                    <WaypointRow label="Pickup — Airport" pinColor="green" showLine>
                      <AirportPicker
                        city={apt.city}
                        terminalIdx={apt.terminalIdx}
                        onAirportChange={(c, ti) =>
                          setApt((s) => ({ ...s, city: c, terminalIdx: ti }))
                        }
                      />
                    </WaypointRow>
                    {apt.stops.map((stop, i) => (
                      <WaypointRow key={i} label={`Stop ${i + 1}`} pinColor="amber" showLine>
                        <div className="flex min-w-0 items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <PlaceSearch
                              preferConfirmScreen
                              value={stop}
                              onChange={(v) =>
                                setApt((s) => ({
                                  ...s,
                                  stops: s.stops.map((x, idx) => (idx === i ? v : x)),
                                }))
                              }
                              placeholder={`Stop ${i + 1} address…`}
                              error={attemptedStep2Submit && !isPlaceReadyForSubmit(stop)}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setApt((s) => ({
                                ...s,
                                stops: s.stops.filter((_, idx) => idx !== i),
                              }))
                            }
                            className="mt-2.5 shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <TrashIcon className="size-3.5" weight="bold" />
                          </button>
                        </div>
                      </WaypointRow>
                    ))}
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center pt-2.5">
                        <div className="size-4" />
                        <div className="mt-1 w-px flex-1 bg-border" />
                      </div>
                      <div className="flex-1 pb-5">
                        <button
                          type="button"
                          onClick={() =>
                            setApt((s) => ({ ...s, stops: [...s.stops, EMPTY_PLACE] }))
                          }
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <PlusIcon className="size-3" weight="bold" />
                          Add stop
                        </button>
                      </div>
                    </div>
                    <WaypointRow label="Drop" pinColor="red" showLine={false}>
                      <PlaceSearch
                        preferConfirmScreen
                        value={apt.customer}
                        onChange={(v) => setApt((s) => ({ ...s, customer: v }))}
                        placeholder="Customer drop address…"
                        error={attemptedStep2Submit && !isPlaceReadyForSubmit(apt.customer)}
                      />
                    </WaypointRow>
                  </>
                ) : (
                  <>
                    <WaypointRow label="Pickup" pinColor="green" showLine>
                      <PlaceSearch
                        preferConfirmScreen
                        value={apt.customer}
                        onChange={(v) => setApt((s) => ({ ...s, customer: v }))}
                        placeholder="Customer pickup address…"
                        error={attemptedStep2Submit && !isPlaceReadyForSubmit(apt.customer)}
                      />
                    </WaypointRow>
                    {apt.stops.map((stop, i) => (
                      <WaypointRow key={i} label={`Stop ${i + 1}`} pinColor="amber" showLine>
                        <div className="flex min-w-0 items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <PlaceSearch
                              preferConfirmScreen
                              value={stop}
                              onChange={(v) =>
                                setApt((s) => ({
                                  ...s,
                                  stops: s.stops.map((x, idx) => (idx === i ? v : x)),
                                }))
                              }
                              placeholder={`Stop ${i + 1} address…`}
                              error={attemptedStep2Submit && !isPlaceReadyForSubmit(stop)}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setApt((s) => ({
                                ...s,
                                stops: s.stops.filter((_, idx) => idx !== i),
                              }))
                            }
                            className="mt-2.5 shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <TrashIcon className="size-3.5" weight="bold" />
                          </button>
                        </div>
                      </WaypointRow>
                    ))}
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center pt-2.5">
                        <div className="size-4" />
                        <div className="mt-1 w-px flex-1 bg-border" />
                      </div>
                      <div className="flex-1 pb-5">
                        <button
                          type="button"
                          onClick={() =>
                            setApt((s) => ({ ...s, stops: [...s.stops, EMPTY_PLACE] }))
                          }
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <PlusIcon className="size-3" weight="bold" />
                          Add stop
                        </button>
                      </div>
                    </div>
                    <WaypointRow label="Drop — Airport" pinColor="red" showLine={false}>
                      <AirportPicker
                        city={apt.city}
                        terminalIdx={apt.terminalIdx}
                        onAirportChange={(c, ti) =>
                          setApt((s) => ({ ...s, city: c, terminalIdx: ti }))
                        }
                      />
                    </WaypointRow>
                  </>
                )}

                <Field className="mt-6 flex flex-col gap-1.5">
                  <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Flight Number{' '}
                    <span className="font-normal normal-case tracking-normal text-muted-foreground">
                      (optional)
                    </span>
                  </FieldLabel>
                  <FieldContent>
                    <InputGroup className="w-full">
                      <InputGroupInput
                        value={apt.flightNo}
                        onChange={(e) => setApt((s) => ({ ...s, flightNo: e.target.value }))}
                        placeholder="e.g. AI 202"
                      />
                    </InputGroup>
                  </FieldContent>
                </Field>
              </CardContent>
            </Card>
          )}

          {sched.tripType === TripType.HOURLY_RENTALS && (
            <>
              <Card>
                <CardContent>
                  <SectionTitle>Package</SectionTitle>
                  {hourly.packages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Loading packages…</p>
                  ) : (
                    <div
                      className={cn(
                        'flex flex-col gap-4 rounded-none p-0.5',
                        attemptedStep2Submit &&
                          sched.tripType === TripType.HOURLY_RENTALS &&
                          hourly.packageId === null &&
                          'ring-2 ring-destructive ring-offset-2 ring-offset-background'
                      )}
                    >
                      <div className="grid grid-cols-4 gap-3">
                        {hourly.packages.map((pkg) => (
                          <button
                            key={pkg.packageId}
                            type="button"
                            onClick={() => setHourly((s) => ({ ...s, packageId: pkg.packageId }))}
                            className={cn(
                              'flex flex-col gap-0.5 border p-3 text-left transition-colors',
                              hourly.packageId === pkg.packageId
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:bg-muted/40'
                            )}
                          >
                            <span
                              className={cn(
                                'text-base font-bold',
                                hourly.packageId === pkg.packageId
                                  ? 'text-primary'
                                  : 'text-foreground'
                              )}
                            >
                              {pkg.hours}h
                            </span>
                            <span className="text-xs text-muted-foreground">{pkg.km} km</span>
                          </button>
                        ))}
                      </div>

                      {hourly.packageId !== null &&
                        (() => {
                          const selected = hourly.packages.find(
                            (p) => p.packageId === hourly.packageId
                          )
                          return selected?.vehicleCategoryPricing.length ? (
                            <div className="border border-border">
                              <p className="border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Pricing — {selected.hours}h / {selected.km}km
                              </p>
                              {selected.vehicleCategoryPricing.map((cp) => (
                                <div
                                  key={cp.categoryId}
                                  className="flex items-center justify-between border-b border-border px-4 py-2.5 last:border-0"
                                >
                                  <span className="text-sm">{cp.categoryName}</span>
                                  <span className="tabular-nums text-sm font-semibold">
                                    ₹{cp.basePrice.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null
                        })()}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <SectionTitle>Pickup Location</SectionTitle>
                  <WaypointRow label="Pickup" pinColor="green" showLine={false}>
                    <PlaceSearch
                      preferConfirmScreen
                      value={hourly.pickup}
                      onChange={(v) => setHourly((s) => ({ ...s, pickup: v }))}
                      placeholder="Starting location…"
                      error={attemptedStep2Submit && !isPlaceReadyForSubmit(hourly.pickup)}
                    />
                  </WaypointRow>
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex items-center justify-between border border-border px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <UserCircleIcon className="size-4 text-muted-foreground" weight="fill" />
              <span className="text-sm font-medium">{cust.data?.name ?? cust.nameInput}</span>
              <span className="text-xs text-muted-foreground">
                {countryCode} {phone}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAttemptedStep2Submit(false)
                setStep(1)
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Change
            </button>
          </div>

          {bookingReq.error && <p className="text-sm text-destructive">{bookingReq.error}</p>}
          {attemptedStep2Submit && !canProceed() && (
            <p className="text-sm text-destructive">
              Please fill in the highlighted fields before creating the booking.
            </p>
          )}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAttemptedStep2Submit(false)
                setStep(1)
              }}
            >
              ← Back
            </Button>
            <Button type="button" disabled={bookingReq.loading} onClick={handleCreateBooking}>
              {bookingReq.loading ? 'Creating…' : 'Create Booking →'}
            </Button>
          </div>
        </>
      )}

      {step === 3 && step3.createdBooking && (
        <>
          <div className="flex items-center gap-3 border border-border bg-card p-5">
            <CheckCircleIcon className="size-5 shrink-0 text-green-500" weight="fill" />
            <div>
              <p className="text-sm font-medium">Booking created successfully</p>
              <p className="font-mono text-xs text-muted-foreground">
                {step3.createdBooking.bookingReference}
              </p>
            </div>
          </div>

          <Card className="py-0">
            <button
              type="button"
              onClick={() => setStep3((s) => ({ ...s, srOpen: !s.srOpen }))}
              className="flex w-full items-center justify-between px-8 py-5"
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Special Request
              </span>
              <CaretDownIcon
                className={cn(
                  'size-4 text-muted-foreground transition-transform duration-200',
                  step3.srOpen && 'rotate-180'
                )}
              />
            </button>

            {step3.srOpen && (
              <div className="border-t border-border px-8 pb-8 pt-6">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-end md:gap-5">
                    <Field className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Vehicle Category
                      </FieldLabel>
                      <FieldContent>
                        <Select
                          value={step3.selectedCategoryId?.toString() ?? ''}
                          onValueChange={(value) => {
                            if (!value) return
                            const cat = resources.vehicleCategories.find(
                              (c) => c.id === Number(value)
                            )
                            if (!cat) return
                            srForm.setValue('vehicleCategory', cat.categoryName)
                            srForm.setValue('vehicle', '')
                            setStep3((s) => ({
                              ...s,
                              selectedCategoryId: cat.id,
                              vehicles: [],
                            }))
                            getVehiclesByCategory(cat.id)
                              .then((r) => setStep3((s) => ({ ...s, vehicles: r.data })))
                              .catch(() => {})
                          }}
                        >
                          <SelectTrigger className="w-full border-b border-b-input bg-transparent py-2 text-sm text-foreground outline-none focus:border-b-ring">
                            <SelectValue placeholder="Select category…" />
                          </SelectTrigger>
                          <SelectContent>
                            {resources.vehicleCategories.map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.categoryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldContent>
                    </Field>
                    <Field className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Vehicle
                      </FieldLabel>
                      <FieldContent>
                        <Select
                          value={srForm.watch('vehicle')}
                          onValueChange={(value) => srForm.setValue('vehicle', value)}
                          disabled={step3.vehicles.length === 0}
                        >
                          <SelectTrigger className="w-full border-b border-b-input bg-transparent py-2 text-sm text-foreground outline-none focus:border-b-ring disabled:opacity-50">
                            <SelectValue
                              placeholder={
                                step3.selectedCategoryId
                                  ? 'Select vehicle…'
                                  : 'Select category first'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {step3.vehicles.map((v) => (
                              <SelectItem key={v.id} value={`${v.brand} ${v.model}`}>
                                {v.brand} {v.model} — {v.vehicleNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldContent>
                    </Field>
                    <Field className="flex min-w-0 shrink-0 flex-col gap-1.5 md:w-[11.5rem]">
                      <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Number of vehicles
                      </FieldLabel>
                      <FieldContent>
                        <InlineQuantityStepper
                          value={sr.numberOfVehicles ?? 0}
                          onChange={(v) => srForm.setValue('numberOfVehicles', v)}
                        />
                      </FieldContent>
                    </Field>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Passengers
                      </p>
                      <div className="flex flex-col gap-3 border border-border p-4">
                        <CounterRow
                          label="Adults"
                          value={sr.passengers?.adults ?? 0}
                          onChange={(v) =>
                            srForm.setValue('passengers', {
                              adults: v,
                              children: sr.passengers?.children ?? 0,
                            })
                          }
                        />
                        <CounterRow
                          label="Children"
                          value={sr.passengers?.children ?? 0}
                          onChange={(v) =>
                            srForm.setValue('passengers', {
                              adults: sr.passengers?.adults ?? 0,
                              children: v,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Luggage
                      </p>
                      <div className="flex flex-col gap-3 border border-border p-4">
                        <CounterRow
                          label="Large"
                          value={sr.luggage?.large ?? 0}
                          onChange={(v) =>
                            srForm.setValue('luggage', {
                              large: v,
                              medium: sr.luggage?.medium ?? 0,
                              small: sr.luggage?.small ?? 0,
                            })
                          }
                        />
                        <CounterRow
                          label="Medium"
                          value={sr.luggage?.medium ?? 0}
                          onChange={(v) =>
                            srForm.setValue('luggage', {
                              large: sr.luggage?.large ?? 0,
                              medium: v,
                              small: sr.luggage?.small ?? 0,
                            })
                          }
                        />
                        <CounterRow
                          label="Small"
                          value={sr.luggage?.small ?? 0}
                          onChange={(v) =>
                            srForm.setValue('luggage', {
                              large: sr.luggage?.large ?? 0,
                              medium: sr.luggage?.medium ?? 0,
                              small: v,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {resources.beverageOptions.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Beverages
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {resources.beverageOptions.map((bev) => {
                          const selected = (sr.beverages ?? []).includes(bev)
                          return (
                            <button
                              key={bev}
                              type="button"
                              onClick={() =>
                                srForm.setValue(
                                  'beverages',
                                  selected
                                    ? (sr.beverages ?? []).filter((b) => b !== bev)
                                    : [...(sr.beverages ?? []), bev]
                                )
                              }
                              className={cn(
                                'min-h-11 min-w-fit border px-4 py-2.5 text-sm font-medium transition-colors',
                                selected
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border text-foreground hover:bg-muted/60'
                              )}
                            >
                              {bev}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Other Notes
                    </FieldLabel>
                    <FieldContent>
                      <textarea
                        placeholder="Any other special requirements…"
                        rows={2}
                        className="w-full resize-none border-b border-b-input bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-b-ring"
                        {...srForm.register('other')}
                      />
                    </FieldContent>
                  </Field>
                </div>
              </div>
            )}
          </Card>

          {step3.error && <p className="text-sm text-destructive">{step3.error}</p>}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push('/bookings')}>
              Skip & Finish
            </Button>
            <Button type="button" disabled={step3.loading} onClick={handleSaveSpecialRequest}>
              {step3.loading ? 'Saving…' : 'Save & Finish'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
