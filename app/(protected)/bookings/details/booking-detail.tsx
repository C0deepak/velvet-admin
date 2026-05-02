'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AirplaneLandingIcon,
  AirplaneTakeoffIcon,
  CheckFatIcon,
  CoinsIcon,
  MapPinIcon,
  PencilSimpleIcon,
  PaperPlaneRightIcon,
  PlusIcon,
  ProhibitIcon,
  ReceiptIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BookingStatusBadge, PaymentStatusDropdown, TripTypeBadge } from '../booking-badges'
import { cn } from '@/lib/utils'
import { AIRPORTS, findTerminal, type AirportCity } from '@/lib/airport-data'
import { AirportPicker } from '../components/airport-picker'
import { PlaceSearch, EMPTY_PLACE, type PlaceValue } from '../new/place-search'
import {
  TripType,
  FlightType,
  WaypointType,
  BookingStatus,
  VehicleChargeType,
  specialRequestSchema,
} from '../schema'
import { BookingVehicleStatus } from '../../fleet/vehicles/schema'
import type {
  TBooking,
  TBookingVehicle,
  TUpdateBooking,
  TVehicleCharge,
  THourlyPackage,
  TSpecialRequest,
} from '../types'
import {
  getBookingById,
  updateBooking,
  updateWaypoints,
  getBookingVehicles,
  getHourlyPackages,
  addOrUpdateBookingVehicle,
  deleteBookingVehicle,
  updateBookingVehicleFare,
  getBookingVehicleCharges,
  updateBookingVehicleCharges,
  getBeverages,
  submitBooking,
  confirmBooking,
  cancelBooking,
  updatePaymentStatus,
} from '../api'
import { getCategories } from '../../fleet/categories/api'
import { getVehiclesByCategory } from '../../fleet/vehicles/api'
import { getChauffeurs } from '../../chauffeurs/api'
import type { TCategory } from '../../fleet/categories/types'
import type { TVehicle } from '../../fleet/vehicles/types'
import type { TChauffeur } from '../../chauffeurs/types'
import { getApiErrorMessage } from '@/helper/api-error-message'

function fleetCategoryChoicesForPickers(all: TCategory[], preferredCategoryId: number | null) {
  const active = all.filter((c) => c.active === 1)
  if (preferredCategoryId == null) return active
  const pref = all.find((c) => c.id === preferredCategoryId)
  if (!pref || pref.active === 1) return active
  const withoutDup = active.filter((c) => c.id !== pref.id)
  return [...withoutDup, pref]
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground',
        className
      )}
    >
      {children}
    </p>
  )
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</p>
    </div>
  )
}

function Chip({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn('border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', className)}
    >
      {label.replace(/_/g, ' ')}
    </span>
  )
}

const VEHICLE_STATUS_CLASS: Record<BookingVehicleStatus, string> = {
  [BookingVehicleStatus.PENDING]:
    'border-amber-400/65 bg-amber-100 text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/12 dark:text-amber-100',
  [BookingVehicleStatus.IN_PROGRESS]:
    'border-orange-400/65 bg-orange-100 text-orange-950 dark:border-orange-500/35 dark:bg-orange-500/12 dark:text-orange-100',
  [BookingVehicleStatus.CONFIRMED]:
    'border-sky-400/65 bg-sky-100 text-sky-950 dark:border-sky-400/35 dark:bg-sky-500/14 dark:text-sky-100',
  [BookingVehicleStatus.STARTED]:
    'border-violet-400/65 bg-violet-100 text-violet-950 dark:border-violet-400/35 dark:bg-violet-500/14 dark:text-violet-100',
  [BookingVehicleStatus.COMPLETED]:
    'border-emerald-400/65 bg-emerald-100 text-emerald-950 dark:border-emerald-500/35 dark:bg-emerald-500/14 dark:text-emerald-100',
  [BookingVehicleStatus.CANCELLED]:
    'border-red-400/65 bg-red-100 text-red-950 dark:border-red-500/40 dark:bg-red-500/14 dark:text-red-100',
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
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-2.5">
        <MapPinIcon className={cn('size-4 shrink-0', colorClass)} weight="fill" />
        {showLine && <div className="mt-1 w-px flex-1 bg-border" />}
      </div>
      <div className={cn('flex-1', showLine ? 'pb-5' : 'pb-1')}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {children}
      </div>
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

function inferAptRouteFromBooking(b: TBooking): { city: AirportCity; terminalIdx: number } {
  const flight = b.metadata.flightType ?? FlightType.ARRIVAL
  const aptWp =
    flight === FlightType.ARRIVAL
      ? b.waypoints.find((w) => w.type === WaypointType.PICKUP)
      : [...b.waypoints].reverse().find((w) => w.type === WaypointType.DROP)
  return findTerminal(aptWp?.address ?? '') ?? { city: 'Delhi', terminalIdx: 0 }
}

type ChargeRow = { key: string; type: VehicleChargeType; amount: number | null }

function mergeChargePayload(rows: ChargeRow[]): TVehicleCharge[] {
  return rows
    .filter(
      (r): r is ChargeRow & { amount: number } =>
        typeof r.amount === 'number' && Number.isFinite(r.amount)
    )
    .map((r) => ({ type: r.type, amount: r.amount }))
}

function hasMeaningfulSpecialRequest(sr: TBooking['specialRequest']): boolean {
  if (!sr) return false
  if (sr.vehicleCategory || sr.vehicle || sr.other) return true
  if ((sr.numberOfVehicles ?? 0) > 0) return true
  if ((sr.beverages?.length ?? 0) > 0) return true
  const p = sr.passengers
  if (p && ((p.adults ?? 0) > 0 || (p.children ?? 0) > 0)) return true
  const l = sr.luggage
  if (l && ((l.large ?? 0) > 0 || (l.medium ?? 0) > 0 || (l.small ?? 0) > 0)) return true
  return false
}

function buildSpecialRequestUpdatePayload(
  vals: TSpecialRequest
): NonNullable<TUpdateBooking['specialRequest']> | undefined {
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
  if (!hasAny) return undefined
  return {
    vehicleCategory: vals.vehicleCategory || undefined,
    vehicle: vals.vehicle || undefined,
    numberOfVehicles: vals.numberOfVehicles || undefined,
    beverages: vals.beverages?.length ? vals.beverages : undefined,
    other: vals.other || undefined,
    ...(hasPassengers && pax && { passengers: { adults: pax.adults, children: pax.children } }),
    ...(hasLuggage &&
      lug && { luggage: { large: lug.large, medium: lug.medium, small: lug.small } }),
  }
}

type EditWp = { dbId?: number; type: WaypointType; place: PlaceValue }

export function BookingDetail() {
  const router = useRouter()
  const params = useSearchParams()
  const id = params.get('id')

  const [page, setPage] = useState({ loading: true, error: null as string | null })
  const [booking, setBooking] = useState<TBooking | null>(null)
  const [vehicles, setVehicles] = useState<TBookingVehicle[]>([])

  const [editOpen, setEditOpen] = useState(false)
  const [edit, setEdit] = useState({
    editTab: 'basics' as 'basics' | 'special',
    rideDate: '',
    pickupTime: '',
    flightNo: '',
    hourlyPackageId: null as number | null,
    saving: false,
    error: null as string | null,
  })
  const [packages, setPackages] = useState<THourlyPackage[]>([])

  const [route, setRoute] = useState({
    wps: [] as EditWp[],
    saving: false,
    error: null as string | null,
  })

  const [aptRoute, setAptRoute] = useState<{
    city: AirportCity
    terminalIdx: number
  } | null>(null)

  const [srCategoryId, setSrCategoryId] = useState<number | null>(null)
  const [srVehicleList, setSrVehicleList] = useState<TVehicle[]>([])

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

  const [resources, setResources] = useState({
    categories: [] as TCategory[],
    chauffeurs: [] as TChauffeur[],
    vehicles: [] as TVehicle[],
    beverageOptions: [] as string[],
    loaded: false,
  })

  const [vehiclePickerList, setVehiclePickerList] = useState<TVehicle[]>([])
  const [vehicleSheet, setVehicleSheet] = useState({
    open: false,
    mode: 'add' as 'add' | 'edit',
    bookingVehicleId: null as number | null,
    categoryId: null as number | null,
    vehicleId: null as number | null,
    chauffeurId: null as number | null,
    saving: false,
    error: null as string | null,
  })

  const srFleetCategoryOptions = useMemo(
    () => fleetCategoryChoicesForPickers(resources.categories, srCategoryId),
    [resources.categories, srCategoryId]
  )

  const vehicleSheetFleetCategoryOptions = useMemo(
    () => fleetCategoryChoicesForPickers(resources.categories, vehicleSheet.categoryId),
    [resources.categories, vehicleSheet.categoryId]
  )

  const [fareSheet, setFareSheet] = useState({
    open: false,
    vehicle: null as TBookingVehicle | null,
    actualFare: '',
    advanceAmount: '',
    saving: false,
    error: null as string | null,
  })

  const [chargesSheet, setChargesSheet] = useState({
    open: false,
    vehicleId: null as number | null,
    chargeRows: [] as ChargeRow[],
    loading: false,
    saving: false,
    error: null as string | null,
  })

  const [workflowBusy, setWorkflowBusy] = useState<
    false | 'payment' | 'submit' | 'confirm' | 'cancel'
  >(false)

  useEffect(() => {
    if (!id) {
      setPage({ loading: false, error: 'No booking ID provided' })
      return
    }
    Promise.all([
      getBookingById(Number(id)),
      getBookingVehicles(Number(id)),
      getCategories(),
      getChauffeurs(),
      getBeverages(),
    ])
      .then(([br, vr, cats, chaufs, bevs]) => {
        setBooking(br.data)
        setVehicles(vr.data)
        initRoute(br.data)
        if (br.data.tripType === TripType.AIRPORT_TRANSFER) {
          setAptRoute(inferAptRouteFromBooking(br.data))
        } else setAptRoute(null)
        setResources((s) => ({
          ...s,
          categories: cats.data,
          chauffeurs: chaufs.data.data,
          beverageOptions: bevs.data,
          loaded: true,
        }))
        setPage({ loading: false, error: null })
      })
      .catch((err) => setPage({ loading: false, error: getApiErrorMessage(err) }))
  }, [id])

  function initRoute(b: TBooking) {
    setRoute({
      wps: b.waypoints.map((wp) => ({
        dbId: wp.id,
        type: wp.type,
        place: {
          address: wp.address,
          placeId: `existing_wp_${wp.id}`,
          latitude: wp.latitude,
          longitude: wp.longitude,
        },
      })),
      saving: false,
      error: null,
    })
  }

  function openEdit() {
    if (!booking) return
    setEdit({
      editTab: 'basics',
      rideDate: booking.rideDate ?? '',
      pickupTime: booking.pickupTime?.slice(0, 5) ?? '',
      flightNo: booking.metadata.flightNo ?? '',
      hourlyPackageId: booking.hourlyPackage?.packageId ?? null,
      saving: false,
      error: null,
    })
    const p = booking.specialRequest
    srForm.reset({
      vehicleCategory: p?.vehicleCategory ?? '',
      vehicle: p?.vehicle ?? '',
      numberOfVehicles: p?.numberOfVehicles ?? 0,
      beverages: p?.beverages ?? [],
      other: p?.other ?? '',
      passengers: {
        adults: p?.passengers?.adults ?? 0,
        children: p?.passengers?.children ?? 0,
      },
      luggage: {
        large: p?.luggage?.large ?? 0,
        medium: p?.luggage?.medium ?? 0,
        small: p?.luggage?.small ?? 0,
      },
    })
    const catName = p?.vehicleCategory
    const cat =
      catName && resources.categories.length
        ? resources.categories.find((c) => c.categoryName === catName)
        : undefined
    if (cat) {
      setSrCategoryId(cat.id)
      getVehiclesByCategory(cat.id)
        .then((r) => setSrVehicleList(r.data))
        .catch(() => setSrVehicleList([]))
    } else {
      setSrCategoryId(null)
      setSrVehicleList([])
    }
    if (booking.tripType === TripType.HOURLY_RENTALS && packages.length === 0) {
      getHourlyPackages()
        .then((r) => setPackages(r.data))
        .catch(() => {})
    }
    setEditOpen(true)
  }

  async function handleEditSaveBasics() {
    if (!booking || !edit.rideDate || !edit.pickupTime) {
      setEdit((s) => ({ ...s, error: 'Ride date and pickup time are required' }))
      return
    }
    setEdit((s) => ({ ...s, saving: true, error: null }))
    const payload: TUpdateBooking = {
      rideDate: edit.rideDate,
      pickupTime: edit.pickupTime.length === 5 ? `${edit.pickupTime}:00` : edit.pickupTime,
      ...(booking.tripType === TripType.AIRPORT_TRANSFER && {
        metadata: {
          flightType: booking.metadata.flightType ?? FlightType.ARRIVAL,
          flightNo: edit.flightNo || undefined,
        },
      }),
      ...(booking.tripType === TripType.HOURLY_RENTALS &&
        edit.hourlyPackageId !== null && { hourlyPackageId: edit.hourlyPackageId }),
    }
    try {
      const { data: updated } = await updateBooking(booking.id, payload)
      setBooking(updated)
      setEdit((s) => ({ ...s, saving: false, error: null }))
    } catch (err) {
      setEdit((s) => ({ ...s, saving: false, error: getApiErrorMessage(err) }))
    }
  }

  async function handleEditSaveSpecialRequest() {
    if (!booking) return
    setEdit((s) => ({ ...s, saving: true, error: null }))
    const vals = srForm.getValues()
    try {
      const { data: updated } = await updateBooking(booking.id, {
        specialRequest: buildSpecialRequestUpdatePayload(vals),
      })
      setBooking(updated)
      setEdit((s) => ({ ...s, saving: false }))
      setEditOpen(false)
    } catch (err) {
      setEdit((s) => ({ ...s, saving: false, error: getApiErrorMessage(err) }))
    }
  }

  function updateWp(index: number, place: PlaceValue) {
    setRoute((s) => ({ ...s, wps: s.wps.map((wp, i) => (i === index ? { ...wp, place } : wp)) }))
  }

  function addStop() {
    setRoute((s) => {
      const dropIdx = s.wps.findLastIndex((wp) => wp.type === WaypointType.DROP)
      const at = dropIdx === -1 ? s.wps.length : dropIdx
      return {
        ...s,
        wps: [
          ...s.wps.slice(0, at),
          { type: WaypointType.STOP, place: EMPTY_PLACE },
          ...s.wps.slice(at),
        ],
      }
    })
  }

  function removeStop(index: number) {
    setRoute((s) => ({ ...s, wps: s.wps.filter((_, i) => i !== index) }))
  }

  async function handleSaveRoute() {
    if (!booking) return
    setRoute((s) => ({ ...s, saving: true, error: null }))
    try {
      const payload = route.wps
        .filter((wp) => {
          const { latitude: lat, longitude: lng } = wp.place
          return (
            !!wp.place.address.trim() &&
            lat != null &&
            lng != null &&
            Number.isFinite(lat) &&
            Number.isFinite(lng)
          )
        })
        .map((wp) => {
          const lat = wp.place.latitude
          const lng = wp.place.longitude
          return {
            type: wp.type,
            address: wp.place.address,
            placeId:
              wp.place.placeId || (wp.dbId != null ? `existing_wp_${wp.dbId}` : `wp_${Date.now()}`),
            latitude: lat as number,
            longitude: lng as number,
          }
        })
      await updateWaypoints(booking.id, payload)
      const { data: refreshed } = await getBookingById(booking.id)
      setBooking(refreshed)
      initRoute(refreshed)
      if (refreshed.tripType === TripType.AIRPORT_TRANSFER) {
        setAptRoute(inferAptRouteFromBooking(refreshed))
      }
      setRoute((s) => ({ ...s, saving: false }))
    } catch (err) {
      setRoute((s) => ({ ...s, saving: false, error: getApiErrorMessage(err) }))
    }
  }

  async function openAddVehicle() {
    if (!booking) return
    setVehiclePickerList([])
    const sr = booking.specialRequest
    let nextCategoryId: number | null = null
    let nextVehicleId: number | null = null
    if (sr?.vehicleCategory && resources.categories.length > 0) {
      const c = resources.categories.find((x) => x.categoryName === sr.vehicleCategory)
      if (c) {
        nextCategoryId = c.id
        try {
          const { data } = await getVehiclesByCategory(c.id)
          setVehiclePickerList(data)
          if (sr.vehicle) {
            const hit = data.find((v) => `${v.brand} ${v.model}` === sr.vehicle)
            if (hit) nextVehicleId = hit.id
          }
        } catch {
          setVehiclePickerList([])
        }
      }
    }
    setVehicleSheet({
      open: true,
      mode: 'add',
      bookingVehicleId: null,
      categoryId: nextCategoryId,
      vehicleId: nextVehicleId,
      chauffeurId: null,
      saving: false,
      error: null,
    })
  }

  async function openEditBookingVehicle(v: TBookingVehicle) {
    const catId = v.vehicleCategoryId
    let list: TVehicle[] = []
    if (catId != null) {
      try {
        const { data } = await getVehiclesByCategory(catId)
        list = data
      } catch {
        list = []
      }
    }
    setVehiclePickerList(list)
    setVehicleSheet({
      open: true,
      mode: 'edit',
      bookingVehicleId: v.id,
      categoryId: catId ?? null,
      vehicleId: v.vehicleId,
      chauffeurId: v.chauffeurId,
      saving: false,
      error: null,
    })
  }

  async function handleVehicleSheetCategoryChange(catId: number) {
    setVehicleSheet((s) => ({ ...s, categoryId: catId, vehicleId: null }))
    const { data } = await getVehiclesByCategory(catId)
    setVehiclePickerList(data)
  }

  async function handleVehicleSheetSave() {
    if (!booking || !vehicleSheet.categoryId) {
      setVehicleSheet((s) => ({
        ...s,
        error: 'Vehicle category is required',
      }))
      return
    }
    setVehicleSheet((s) => ({ ...s, saving: true, error: null }))
    try {
      const base = {
        vehicleCategoryId: vehicleSheet.categoryId ?? undefined,
        vehicleId: vehicleSheet.vehicleId ?? undefined,
        chauffeurId: vehicleSheet.chauffeurId ?? undefined,
      }
      const { data: v } =
        vehicleSheet.mode === 'add'
          ? await addOrUpdateBookingVehicle({ bookingId: booking.id, ...base })
          : await addOrUpdateBookingVehicle({
              id: vehicleSheet.bookingVehicleId ?? undefined,
              ...base,
            })
      setVehicles((prev) =>
        vehicleSheet.mode === 'add' ? [...prev, v] : prev.map((x) => (x.id === v.id ? v : x))
      )
      setVehicleSheet({
        open: false,
        mode: 'add',
        bookingVehicleId: null,
        categoryId: null,
        vehicleId: null,
        chauffeurId: null,
        saving: false,
        error: null,
      })
    } catch (err) {
      setVehicleSheet((s) => ({
        ...s,
        saving: false,
        error: getApiErrorMessage(err),
      }))
    }
  }

  async function handleDeleteVehicle(vehicleId: number) {
    try {
      await deleteBookingVehicle(vehicleId)
      setVehicles((s) => s.filter((v) => v.id !== vehicleId))
    } catch {}
  }

  function openFareSheet(v: TBookingVehicle) {
    setFareSheet({
      open: true,
      vehicle: v,
      actualFare: String(v.actualFare),
      advanceAmount: String(v.advanceAmount),
      saving: false,
      error: null,
    })
  }

  async function handleSaveFare() {
    if (!fareSheet.vehicle) return
    setFareSheet((s) => ({ ...s, saving: true, error: null }))
    try {
      const { data: updated } = await updateBookingVehicleFare(fareSheet.vehicle.id, {
        actualFare: Number(fareSheet.actualFare),
        advanceAmount: Number(fareSheet.advanceAmount),
      })
      setVehicles((s) => s.map((v) => (v.id === updated.id ? updated : v)))
      setFareSheet((s) => ({ ...s, open: false, saving: false }))
    } catch (err) {
      setFareSheet((s) => ({ ...s, saving: false, error: getApiErrorMessage(err) }))
    }
  }

  async function openChargesSheet(vehicleId: number) {
    setChargesSheet({
      open: true,
      vehicleId,
      chargeRows: [],
      loading: true,
      saving: false,
      error: null,
    })
    try {
      const { data } = await getBookingVehicleCharges(vehicleId)
      const rows: ChargeRow[] = data.map((c, i) => ({
        key: `${c.type}_${i}`,
        type: c.type,
        amount: c.amount,
      }))
      if (rows.length === 0) {
        rows.push({ key: 'mc_default', type: VehicleChargeType.MC_FARE, amount: null })
      }
      setChargesSheet((s) => ({ ...s, chargeRows: rows, loading: false }))
    } catch {
      setChargesSheet((s) => ({
        ...s,
        chargeRows: [{ key: 'mc_default', type: VehicleChargeType.MC_FARE, amount: null }],
        loading: false,
      }))
    }
  }

  function updateChargeRow(
    key: string,
    patch: Partial<{ type: VehicleChargeType; amount: number | null }>
  ) {
    setChargesSheet((s) => ({
      ...s,
      chargeRows: s.chargeRows.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    }))
  }

  function addChargeRow() {
    setChargesSheet((s) => ({
      ...s,
      chargeRows: [
        ...s.chargeRows,
        {
          key: `new_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          type: VehicleChargeType.PARKING_CHARGE,
          amount: null,
        },
      ],
    }))
  }

  function removeChargeRow(key: string) {
    setChargesSheet((s) => ({
      ...s,
      chargeRows:
        s.chargeRows.filter((r) => r.key !== key).length > 0
          ? s.chargeRows.filter((r) => r.key !== key)
          : [{ key: `fallback_${Date.now()}`, type: VehicleChargeType.MC_FARE, amount: null }],
    }))
  }

  async function handleSaveCharges() {
    if (!chargesSheet.vehicleId) return
    setChargesSheet((s) => ({ ...s, saving: true, error: null }))
    try {
      await updateBookingVehicleCharges(
        chargesSheet.vehicleId,
        mergeChargePayload(chargesSheet.chargeRows)
      )
      setChargesSheet((s) => ({ ...s, open: false, saving: false }))
    } catch (err) {
      setChargesSheet((s) => ({ ...s, saving: false, error: getApiErrorMessage(err) }))
    }
  }

  async function fetchAndApplyBooking(bookingId: number, options?: { refreshRoute?: boolean }) {
    const { data } = await getBookingById(bookingId)
    setBooking(data)
    if (options?.refreshRoute === false) return
    if (data.tripType === TripType.AIRPORT_TRANSFER) {
      setAptRoute(inferAptRouteFromBooking(data))
    } else setAptRoute(null)
    initRoute(data)
  }

  async function handlePaymentChange(next: 'PENDING' | 'PAID') {
    if (!booking) return
    setWorkflowBusy('payment')
    try {
      await updatePaymentStatus(booking.id, next)
      await fetchAndApplyBooking(booking.id, { refreshRoute: false })
    } catch (err) {
      alert(getApiErrorMessage(err))
    } finally {
      setWorkflowBusy(false)
    }
  }

  async function handleSubmitRideRequest() {
    if (!booking) return
    setWorkflowBusy('submit')
    try {
      await submitBooking(booking.id)
      await fetchAndApplyBooking(booking.id)
    } catch (err) {
      alert(getApiErrorMessage(err))
    } finally {
      setWorkflowBusy(false)
    }
  }

  async function handleConfirmBooking() {
    if (!booking) return
    setWorkflowBusy('confirm')
    try {
      await confirmBooking(booking.id)
      await fetchAndApplyBooking(booking.id)
    } catch (err) {
      alert(getApiErrorMessage(err))
    } finally {
      setWorkflowBusy(false)
    }
  }

  async function handleCancelBooking() {
    if (!booking || workflowBusy) return
    if (!window.confirm('Cancel this booking for the customer?')) return
    setWorkflowBusy('cancel')
    try {
      await cancelBooking(booking.id)
      await fetchAndApplyBooking(booking.id)
    } catch (err) {
      alert(getApiErrorMessage(err))
    } finally {
      setWorkflowBusy(false)
    }
  }

  if (page.loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading booking…</p>
      </div>
    )
  }

  if (page.error || !booking) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">{page.error ?? 'Booking not found'}</p>
        <Button variant="outline" onClick={() => router.push('/bookings')}>
          ← Back to Bookings
        </Button>
      </div>
    )
  }

  const stopWps = route.wps.filter((wp) => wp.type === WaypointType.STOP)
  const pickupIdx = route.wps.findIndex((wp) => wp.type === WaypointType.PICKUP)
  const dropIdx = route.wps.findLastIndex((wp) => wp.type === WaypointType.DROP)

  const selectedPackage = packages.find((p) => p.packageId === edit.hourlyPackageId)

  const airportWaypointIndex =
    booking.tripType === TripType.AIRPORT_TRANSFER
      ? (booking.metadata.flightType ?? FlightType.ARRIVAL) === FlightType.ARRIVAL
        ? pickupIdx
        : dropIdx
      : -1

  function syncAirportFromPicker(city: AirportCity, terminalIdx: number) {
    setAptRoute({ city, terminalIdx })
    if (airportWaypointIndex < 0) return
    const t = AIRPORTS[city].terminals[terminalIdx]
    updateWp(airportWaypointIndex, {
      address: t.address,
      placeId: t.placeId,
      latitude: t.latitude,
      longitude: t.longitude,
    })
  }

  const srWatch = srForm.watch()
  const aptResolved = aptRoute ?? { city: 'Delhi' as AirportCity, terminalIdx: 0 }

  const canSubmitRideRequest = booking.status === BookingStatus.PENDING
  const canConfirmRide = booking.status === BookingStatus.REQUESTED
  const canCancelRide =
    booking.status !== BookingStatus.CANCELLED_BY_ADMIN &&
    booking.status !== BookingStatus.COMPLETED
  const workflowLocked = workflowBusy !== false

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <button
            type="button"
            onClick={() => router.push('/bookings')}
            className="w-fit text-xs text-muted-foreground hover:text-foreground"
          >
            ← All Bookings
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-2 gap-y-2">
            <span className="font-mono text-xl font-bold tracking-tight">
              {booking.bookingReference}
            </span>
            <BookingStatusBadge status={booking.status} />
            <PaymentStatusDropdown
              status={booking.paymentStatus}
              updating={workflowBusy === 'payment'}
              onPaid={() => void handlePaymentChange('PAID')}
              onUnpaid={() => void handlePaymentChange('PENDING')}
            />
            <TripTypeBadge tripType={booking.tripType} />
          </div>
          {(canSubmitRideRequest || canConfirmRide || canCancelRide) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {canSubmitRideRequest && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={workflowLocked}
                  onClick={() => void handleSubmitRideRequest()}
                >
                  <PaperPlaneRightIcon className="mr-1.5 size-3.5" weight="bold" />
                  {workflowBusy === 'submit' ? 'Submitting…' : 'Request ride'}
                </Button>
              )}
              {canConfirmRide && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={workflowLocked}
                  onClick={() => void handleConfirmBooking()}
                >
                  <CheckFatIcon className="mr-1.5 size-3.5" weight="bold" />
                  {workflowBusy === 'confirm' ? 'Confirming…' : 'Confirm ride'}
                </Button>
              )}
              {canCancelRide && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={workflowLocked}
                  onClick={() => void handleCancelBooking()}
                >
                  <ProhibitIcon className="mr-1.5 size-3.5" weight="bold" />
                  {workflowBusy === 'cancel' ? 'Cancelling…' : 'Cancel ride'}
                </Button>
              )}
            </div>
          )}
        </div>
        <Button onClick={openEdit}>
          <PencilSimpleIcon className="mr-2 size-3.5" weight="bold" />
          Edit Booking
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <Card>
          <CardContent>
            <SectionTitle>Booking Details</SectionTitle>
            <div className="grid grid-cols-3 gap-x-8 gap-y-5">
              <InfoField label="Ride Date" value={booking.rideDate} />
              <InfoField label="Pickup Time" value={booking.pickupTime?.slice(0, 5)} />
              <InfoField label="Source" value={booking.bookingSource} />
              <InfoField label="Customer" value={booking.metadata.customerName} />
              <InfoField label="Contact" value={booking.metadata.customerContact} />
              <InfoField label="Type" value={booking.metadata.customerType} />
              {booking.metadata.remarks && (
                <InfoField label="Remarks" value={booking.metadata.remarks} />
              )}
              {booking.tripType === TripType.AIRPORT_TRANSFER && (
                <>
                  <InfoField label="Flight Type" value={booking.metadata.flightType} />
                  <InfoField label="Flight No" value={booking.metadata.flightNo} />
                </>
              )}
              {booking.tripType === TripType.HOURLY_RENTALS && booking.hourlyPackage && (
                <InfoField
                  label="Package"
                  value={`${booking.hourlyPackage.hourlyPackageDetails.hours}h / ${booking.hourlyPackage.hourlyPackageDetails.km}km`}
                />
              )}
            </div>
            {booking.specialRequest && hasMeaningfulSpecialRequest(booking.specialRequest) && (
              <div className="col-span-3 mt-2 rounded-md border border-dashed border-border p-5">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Special Request
                </p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-3">
                  {booking.specialRequest.vehicleCategory && (
                    <InfoField
                      label="Vehicle category"
                      value={booking.specialRequest.vehicleCategory}
                    />
                  )}
                  {booking.specialRequest.vehicle && (
                    <InfoField label="Vehicle" value={booking.specialRequest.vehicle} />
                  )}
                  {booking.specialRequest.numberOfVehicles != null && (
                    <InfoField
                      label="Fleet size"
                      value={String(booking.specialRequest.numberOfVehicles)}
                    />
                  )}
                  {booking.specialRequest.passengers && (
                    <InfoField
                      label="Passengers"
                      value={`Adults ${booking.specialRequest.passengers.adults ?? 0} · Children ${booking.specialRequest.passengers.children ?? 0}`}
                    />
                  )}
                  {booking.specialRequest.luggage && (
                    <InfoField
                      label="Luggage"
                      value={`L ${booking.specialRequest.luggage.large ?? 0} · M ${booking.specialRequest.luggage.medium ?? 0} · S ${booking.specialRequest.luggage.small ?? 0}`}
                    />
                  )}
                  {booking.specialRequest.beverages &&
                    booking.specialRequest.beverages.length > 0 && (
                      <InfoField
                        label="Beverages"
                        value={booking.specialRequest.beverages.join(', ')}
                      />
                    )}
                  {booking.specialRequest.other && (
                    <InfoField label="Other" value={booking.specialRequest.other} />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SectionTitle>Financials</SectionTitle>
            <div className="grid grid-cols-3 gap-x-8 gap-y-5">
              <InfoField
                label="Estimated Fare"
                value={
                  booking.estimatedFare != null
                    ? `₹${booking.estimatedFare.toLocaleString('en-IN')}`
                    : null
                }
              />
              <InfoField
                label="Actual Fare"
                value={
                  booking.actualFare != null
                    ? `₹${booking.actualFare.toLocaleString('en-IN')}`
                    : null
                }
              />
              <InfoField
                label="Total Fare"
                value={
                  booking.totalFare != null ? `₹${booking.totalFare.toLocaleString('en-IN')}` : null
                }
              />
              <InfoField
                label="Advance"
                value={
                  booking.advanceAmount != null
                    ? `₹${booking.advanceAmount.toLocaleString('en-IN')}`
                    : null
                }
              />
              <InfoField
                label="Balance"
                value={
                  booking.balanceAmount != null
                    ? `₹${booking.balanceAmount.toLocaleString('en-IN')}`
                    : null
                }
              />
              <InfoField label="Payment Mode" value={booking.paymentMode} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <SectionTitle>Route</SectionTitle>
          <div className="mb-6 rounded-md border border-border bg-muted/20 p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Waypoints
            </p>
            <ul className="flex flex-col gap-2">
              {route.wps.map((wp, i) => (
                <li
                  key={wp.dbId ?? `wp_${i}_${wp.type}`}
                  className="flex gap-3 border-l-2 border-l-primary/40 pl-3 text-xs leading-relaxed"
                >
                  <span className="shrink-0 font-bold uppercase tracking-wider text-muted-foreground">
                    {wp.type.replace(/_/g, ' ')}
                  </span>
                  <span className="min-w-0 flex-1 text-foreground">{wp.place.address || '—'}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {wp.place.latitude != null &&
                    wp.place.longitude != null &&
                    Number.isFinite(wp.place.latitude) &&
                    Number.isFinite(wp.place.longitude)
                      ? `${wp.place.latitude.toFixed(5)}, ${wp.place.longitude.toFixed(5)}`
                      : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {booking.tripType === TripType.ONE_WAY && (
            <>
              {pickupIdx !== -1 && (
                <WaypointRow label="Pickup" pinColor="green" showLine>
                  <PlaceSearch
                    preferConfirmScreen
                    value={route.wps[pickupIdx].place}
                    onChange={(v) => updateWp(pickupIdx, v)}
                    placeholder="Search pickup…"
                  />
                </WaypointRow>
              )}
              {route.wps.map((wp, i) =>
                wp.type !== WaypointType.STOP ? null : (
                  <WaypointRow
                    key={i}
                    label={`Stop ${stopWps.indexOf(wp) + 1}`}
                    pinColor="amber"
                    showLine
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <PlaceSearch
                          preferConfirmScreen
                          value={wp.place}
                          onChange={(v) => updateWp(i, v)}
                          placeholder={`Stop ${stopWps.indexOf(wp) + 1} address…`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStop(i)}
                        className="mt-2.5 shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <TrashIcon className="size-3.5" weight="bold" />
                      </button>
                    </div>
                  </WaypointRow>
                )
              )}
              <div className="flex gap-3">
                <div className="flex flex-col items-center pt-2.5">
                  <div className="size-4" />
                  <div className="mt-1 w-px flex-1 bg-border" />
                </div>
                <div className="flex-1 pb-5">
                  <button
                    type="button"
                    onClick={addStop}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <PlusIcon className="size-3" weight="bold" />
                    Add stop
                  </button>
                </div>
              </div>
              {dropIdx !== -1 && (
                <WaypointRow label="Drop" pinColor="red" showLine={false}>
                  <PlaceSearch
                    preferConfirmScreen
                    value={route.wps[dropIdx].place}
                    onChange={(v) => updateWp(dropIdx, v)}
                    placeholder="Search drop…"
                  />
                </WaypointRow>
              )}
            </>
          )}

          {booking.tripType === TripType.AIRPORT_TRANSFER &&
            (() => {
              const aptIdx =
                booking.metadata.flightType === FlightType.ARRIVAL ? pickupIdx : dropIdx
              const custIdx =
                booking.metadata.flightType === FlightType.ARRIVAL ? dropIdx : pickupIdx
              const aptLabel =
                booking.metadata.flightType === FlightType.ARRIVAL
                  ? 'Pickup — Airport'
                  : 'Drop — Airport'
              const custLabel =
                booking.metadata.flightType === FlightType.ARRIVAL ? 'Drop' : 'Pickup'

              return (
                <>
                  <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
                    {booking.metadata.flightType === FlightType.ARRIVAL ? (
                      <AirplaneLandingIcon className="size-4" />
                    ) : (
                      <AirplaneTakeoffIcon className="size-4" />
                    )}
                    <span className="font-semibold uppercase tracking-wider">
                      {booking.metadata.flightType ?? 'Arrival'}
                    </span>
                    {booking.metadata.flightNo && (
                      <span className="ml-1 font-mono">· {booking.metadata.flightNo}</span>
                    )}
                  </div>

                  {booking.metadata.flightType === FlightType.ARRIVAL ? (
                    <>
                      {aptIdx !== -1 && (
                        <WaypointRow label={aptLabel} pinColor="green" showLine>
                          <AirportPicker
                            city={aptResolved.city}
                            terminalIdx={aptResolved.terminalIdx}
                            onAirportChange={(c, ti) => syncAirportFromPicker(c, ti)}
                          />
                        </WaypointRow>
                      )}
                      {route.wps.map((wp, i) =>
                        wp.type !== WaypointType.STOP ? null : (
                          <WaypointRow
                            key={i}
                            label={`Stop ${stopWps.indexOf(wp) + 1}`}
                            pinColor="amber"
                            showLine
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <PlaceSearch
                                  preferConfirmScreen
                                  value={wp.place}
                                  onChange={(v) => updateWp(i, v)}
                                  placeholder={`Stop ${stopWps.indexOf(wp) + 1}…`}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeStop(i)}
                                className="mt-2.5 shrink-0 text-muted-foreground hover:text-destructive"
                              >
                                <TrashIcon className="size-3.5" weight="bold" />
                              </button>
                            </div>
                          </WaypointRow>
                        )
                      )}
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center pt-2.5">
                          <div className="size-4" />
                          <div className="mt-1 w-px flex-1 bg-border" />
                        </div>
                        <div className="flex-1 pb-5">
                          <button
                            type="button"
                            onClick={addStop}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <PlusIcon className="size-3" weight="bold" />
                            Add stop
                          </button>
                        </div>
                      </div>
                      {custIdx !== -1 && (
                        <WaypointRow label={custLabel} pinColor="red" showLine={false}>
                          <PlaceSearch
                            preferConfirmScreen
                            value={route.wps[custIdx].place}
                            onChange={(v) => updateWp(custIdx, v)}
                            placeholder="Customer drop address…"
                          />
                        </WaypointRow>
                      )}
                    </>
                  ) : (
                    <>
                      {custIdx !== -1 && (
                        <WaypointRow label={custLabel} pinColor="green" showLine>
                          <PlaceSearch
                            preferConfirmScreen
                            value={route.wps[custIdx].place}
                            onChange={(v) => updateWp(custIdx, v)}
                            placeholder="Customer pickup address…"
                          />
                        </WaypointRow>
                      )}
                      {route.wps.map((wp, i) =>
                        wp.type !== WaypointType.STOP ? null : (
                          <WaypointRow
                            key={i}
                            label={`Stop ${stopWps.indexOf(wp) + 1}`}
                            pinColor="amber"
                            showLine
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <PlaceSearch
                                  preferConfirmScreen
                                  value={wp.place}
                                  onChange={(v) => updateWp(i, v)}
                                  placeholder={`Stop ${stopWps.indexOf(wp) + 1}…`}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeStop(i)}
                                className="mt-2.5 shrink-0 text-muted-foreground hover:text-destructive"
                              >
                                <TrashIcon className="size-3.5" weight="bold" />
                              </button>
                            </div>
                          </WaypointRow>
                        )
                      )}
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center pt-2.5">
                          <div className="size-4" />
                          <div className="mt-1 w-px flex-1 bg-border" />
                        </div>
                        <div className="flex-1 pb-5">
                          <button
                            type="button"
                            onClick={addStop}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <PlusIcon className="size-3" weight="bold" />
                            Add stop
                          </button>
                        </div>
                      </div>
                      {aptIdx !== -1 && (
                        <WaypointRow label={aptLabel} pinColor="red" showLine={false}>
                          <AirportPicker
                            city={aptResolved.city}
                            terminalIdx={aptResolved.terminalIdx}
                            onAirportChange={(c, ti) => syncAirportFromPicker(c, ti)}
                          />
                        </WaypointRow>
                      )}
                    </>
                  )}
                </>
              )
            })()}

          {booking.tripType === TripType.HOURLY_RENTALS && pickupIdx !== -1 && (
            <WaypointRow label="Pickup" pinColor="green" showLine={false}>
              <PlaceSearch
                preferConfirmScreen
                value={route.wps[pickupIdx].place}
                onChange={(v) => updateWp(pickupIdx, v)}
                placeholder="Search pickup…"
              />
            </WaypointRow>
          )}

          {route.error && <p className="mt-3 text-sm text-destructive">{route.error}</p>}
          <div className="mt-6 flex justify-end">
            <Button type="button" disabled={route.saving} onClick={handleSaveRoute}>
              {route.saving ? 'Saving…' : 'Save Route'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-5 flex items-center justify-between">
            <SectionTitle className="mb-0">Assigned Vehicles</SectionTitle>
            <Button size="sm" onClick={openAddVehicle}>
              <PlusIcon className="mr-1.5 size-3.5" weight="bold" />
              Add Vehicle
            </Button>
          </div>

          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vehicles assigned yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {vehicles.map((v) => (
                <div key={v.id} className="border border-border p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Chip label={v.status} className={VEHICLE_STATUS_CLASS[v.status]} />
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className="text-sm font-semibold">{v.metadata.categoryName}</p>
                        {(v.metadata.vehicleBrand || v.metadata.vehicleModel) && (
                          <>
                            <span className="text-muted-foreground/40" aria-hidden>
                              ·
                            </span>
                            <p className="text-xs font-medium text-foreground">
                              {[v.metadata.vehicleBrand, v.metadata.vehicleModel]
                                .filter(Boolean)
                                .join(' ')}
                            </p>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {v.vehicleNumber ?? '—'}
                        {v.metadata.chauffeurName && ` · ${v.metadata.chauffeurName}`}
                        {v.metadata.chauffeurContact && ` · ${v.metadata.chauffeurContact}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button size="sm" onClick={() => void openEditBookingVehicle(v)}>
                        <PencilSimpleIcon className="mr-1.5 size-3.5" weight="bold" />
                        Update
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVehicle(v.id)}
                        className="rounded-md border border-transparent p-1.5 text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                        aria-label="Remove vehicle"
                      >
                        <TrashIcon className="size-4" weight="bold" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-4 gap-5">
                      <InfoField
                        label="Base Fare"
                        value={`₹${v.baseFare.toLocaleString('en-IN')}`}
                      />
                      <InfoField
                        label="Actual Fare"
                        value={`₹${v.actualFare.toLocaleString('en-IN')}`}
                      />
                      <InfoField
                        label="Advance"
                        value={`₹${v.advanceAmount.toLocaleString('en-IN')}`}
                      />
                      <InfoField
                        label="Balance"
                        value={`₹${v.balanceAmount.toLocaleString('en-IN')}`}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => openFareSheet(v)}
                      >
                        <CoinsIcon className="size-3.5 shrink-0" weight="bold" />
                        Fare
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => openChargesSheet(v.id)}
                      >
                        <ReceiptIcon className="size-3.5 shrink-0" weight="bold" />
                        Extra charges
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) {
            setEdit((s) => ({ ...s, editTab: 'basics', saving: false, error: null }))
          }
        }}
      >
        <SheetContent className="flex min-w-120 flex-col gap-0 overflow-y-auto p-0">
          <SheetHeader className="space-y-0 border-0 px-8 pb-0 pt-6">
            <SheetTitle>Edit Booking</SheetTitle>
            <div className="flex flex-wrap items-center gap-2 pb-5 pt-1">
              <TripTypeBadge tripType={booking.tripType} />
            </div>
            <nav
              className="-mx-8 grid grid-cols-2 gap-4 border-b border-border px-8"
              role="tablist"
              aria-label="Edit booking sections"
            >
              {(
                [
                  { id: 'basics' as const, label: 'Basics', hint: 'Date, time & trip details' },
                  {
                    id: 'special' as const,
                    label: 'Special request',
                    hint: 'Vehicle, passengers & notes',
                  },
                ] as const
              ).map(({ id: tabId, label, hint }) => {
                const active = edit.editTab === tabId
                return (
                  <button
                    key={tabId}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    id={`edit-booking-tab-${tabId}`}
                    onClick={() => setEdit((s) => ({ ...s, editTab: tabId, error: null }))}
                    className={cn(
                      'group relative flex min-w-0 flex-1 flex-col items-start gap-0.5 border-b-2 pb-3 pl-1 pr-3 pt-1 text-left transition-colors sm:flex-none sm:pl-0',
                      '-mb-px outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      active
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'text-[11px] font-semibold uppercase tracking-[0.14em]',
                        active && 'text-foreground'
                      )}
                    >
                      {label}
                    </span>
                    <span className="hidden text-[11px] leading-snug tracking-normal text-muted-foreground sm:block">
                      {hint}
                    </span>
                  </button>
                )
              })}
            </nav>
          </SheetHeader>
          <div
            className="flex flex-col gap-6 px-8 py-6"
            role="tabpanel"
            aria-labelledby={`edit-booking-tab-${edit.editTab}`}
          >
            {edit.editTab === 'basics' ? (
              <>
                <div className="grid grid-cols-2 gap-5">
                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Ride Date
                    </FieldLabel>
                    <FieldContent>
                      <DatePicker
                        value={edit.rideDate}
                        onChange={(v) => setEdit((s) => ({ ...s, rideDate: v }))}
                        error={!!edit.error && !edit.rideDate}
                      />
                    </FieldContent>
                  </Field>
                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Pickup Time
                    </FieldLabel>
                    <FieldContent>
                      <TimePicker
                        value={edit.pickupTime}
                        onChange={(v) => setEdit((s) => ({ ...s, pickupTime: v }))}
                        error={!!edit.error && !edit.pickupTime}
                      />
                    </FieldContent>
                  </Field>
                </div>

                {booking.tripType === TripType.AIRPORT_TRANSFER && (
                  <>
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-4 py-3 text-xs">
                      {booking.metadata.flightType === FlightType.ARRIVAL ? (
                        <AirplaneLandingIcon className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <AirplaneTakeoffIcon className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-semibold uppercase tracking-wider text-muted-foreground">
                          Flight type
                        </p>
                        <p className="text-sm text-foreground">
                          {booking.metadata.flightType ?? '—'}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Arrival/departure fixes the waypoint order on this booking; only the
                          flight number is editable here.
                        </p>
                      </div>
                    </div>
                    <Field className="flex flex-col gap-1.5">
                      <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Flight Number{' '}
                        <span className="font-normal normal-case tracking-normal">(optional)</span>
                      </FieldLabel>
                      <FieldContent>
                        <InputGroup className="w-full">
                          <InputGroupInput
                            value={edit.flightNo}
                            onChange={(e) => setEdit((s) => ({ ...s, flightNo: e.target.value }))}
                            placeholder="e.g. AI 202"
                          />
                        </InputGroup>
                      </FieldContent>
                    </Field>
                  </>
                )}

                {booking.tripType === TripType.HOURLY_RENTALS && (
                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Package
                    </FieldLabel>
                    <FieldContent>
                      {packages.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Loading packages…</p>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            {packages.map((pkg) => (
                              <button
                                key={pkg.packageId}
                                type="button"
                                onClick={() =>
                                  setEdit((s) => ({ ...s, hourlyPackageId: pkg.packageId }))
                                }
                                className={cn(
                                  'flex flex-col gap-0.5 border p-3 text-left transition-colors',
                                  edit.hourlyPackageId === pkg.packageId
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-muted/40'
                                )}
                              >
                                <span
                                  className={cn(
                                    'text-base font-bold',
                                    edit.hourlyPackageId === pkg.packageId
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
                          {selectedPackage?.vehicleCategoryPricing.length ? (
                            <div className="mt-3 border border-border">
                              <p className="border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Pricing — {selectedPackage.hours}h / {selectedPackage.km}km
                              </p>
                              {selectedPackage.vehicleCategoryPricing.map((cp) => (
                                <div
                                  key={cp.categoryId}
                                  className="flex items-center justify-between border-b border-border px-3 py-2 last:border-0"
                                >
                                  <span className="text-xs">{cp.categoryName}</span>
                                  <span className="text-xs font-semibold tabular-nums">
                                    ₹{cp.basePrice.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </>
                      )}
                    </FieldContent>
                  </Field>
                )}
              </>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Special request
                </p>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-5">
                    <Field className="flex flex-col gap-1.5">
                      <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Vehicle Category
                      </FieldLabel>
                      <FieldContent>
                        <Select
                          value={srCategoryId?.toString() ?? ''}
                          onValueChange={(value) => {
                            if (!value) return
                            const cat = resources.categories.find((c) => c.id === Number(value))
                            if (!cat) return
                            srForm.setValue('vehicleCategory', cat.categoryName)
                            srForm.setValue('vehicle', '')
                            setSrCategoryId(cat.id)
                            setSrVehicleList([])
                            getVehiclesByCategory(cat.id)
                              .then((r) => setSrVehicleList(r.data))
                              .catch(() => {})
                          }}
                        >
                          <SelectTrigger className="min-w-full">
                            <SelectValue placeholder="Select category…" />
                          </SelectTrigger>
                          <SelectContent>
                            {srFleetCategoryOptions.map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.categoryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldContent>
                    </Field>
                    <Field className="flex flex-col gap-1.5">
                      <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Vehicle <span className="font-normal">(matches name)</span>
                      </FieldLabel>
                      <FieldContent>
                        <Select
                          value={srForm.watch('vehicle')}
                          onValueChange={(val) => srForm.setValue('vehicle', val)}
                          disabled={srVehicleList.length === 0}
                        >
                          <SelectTrigger className="min-w-full">
                            <SelectValue
                              placeholder={
                                srCategoryId ? 'Select vehicle…' : 'Select category first'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {srVehicleList.map((veh) => (
                              <SelectItem key={veh.id} value={`${veh.brand} ${veh.model}`}>
                                {veh.brand} {veh.model} — {veh.vehicleNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldContent>
                    </Field>
                  </div>

                  <CounterRow
                    label="Number of Vehicles"
                    value={srWatch.numberOfVehicles ?? 0}
                    onChange={(nv) => srForm.setValue('numberOfVehicles', nv)}
                  />

                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Passengers
                    </p>
                    <div className="flex flex-col gap-3 border border-border p-4">
                      <CounterRow
                        label="Adults"
                        value={srWatch.passengers?.adults ?? 0}
                        onChange={(nv) =>
                          srForm.setValue('passengers', {
                            adults: nv,
                            children: srWatch.passengers?.children ?? 0,
                          })
                        }
                      />
                      <CounterRow
                        label="Children"
                        value={srWatch.passengers?.children ?? 0}
                        onChange={(nv) =>
                          srForm.setValue('passengers', {
                            adults: srWatch.passengers?.adults ?? 0,
                            children: nv,
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
                        value={srWatch.luggage?.large ?? 0}
                        onChange={(nv) =>
                          srForm.setValue('luggage', {
                            large: nv,
                            medium: srWatch.luggage?.medium ?? 0,
                            small: srWatch.luggage?.small ?? 0,
                          })
                        }
                      />
                      <CounterRow
                        label="Medium"
                        value={srWatch.luggage?.medium ?? 0}
                        onChange={(nv) =>
                          srForm.setValue('luggage', {
                            large: srWatch.luggage?.large ?? 0,
                            medium: nv,
                            small: srWatch.luggage?.small ?? 0,
                          })
                        }
                      />
                      <CounterRow
                        label="Small"
                        value={srWatch.luggage?.small ?? 0}
                        onChange={(nv) =>
                          srForm.setValue('luggage', {
                            large: srWatch.luggage?.large ?? 0,
                            medium: srWatch.luggage?.medium ?? 0,
                            small: nv,
                          })
                        }
                      />
                    </div>
                  </div>

                  {resources.beverageOptions.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Beverages
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {resources.beverageOptions.map((bev) => {
                          const selected = (srWatch.beverages ?? []).includes(bev)
                          return (
                            <button
                              key={bev}
                              type="button"
                              onClick={() =>
                                srForm.setValue(
                                  'beverages',
                                  selected
                                    ? (srWatch.beverages ?? []).filter((b) => b !== bev)
                                    : [...(srWatch.beverages ?? []), bev]
                                )
                              }
                              className={cn(
                                'border px-3 py-1.5 text-xs font-medium transition-colors',
                                selected
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
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
              </>
            )}

            {edit.error && <p className="text-sm text-destructive">{edit.error}</p>}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              {edit.editTab === 'basics' ? (
                <Button disabled={edit.saving} onClick={() => void handleEditSaveBasics()}>
                  {edit.saving ? 'Saving…' : 'Save basics'}
                </Button>
              ) : (
                <Button disabled={edit.saving} onClick={() => void handleEditSaveSpecialRequest()}>
                  {edit.saving ? 'Saving…' : 'Save special request'}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={fareSheet.open} onOpenChange={(o) => setFareSheet((s) => ({ ...s, open: o }))}>
        <SheetContent className="flex min-w-95 flex-col gap-0 p-0">
          <SheetHeader className="border-b border-border px-8 py-6">
            <SheetTitle>Edit Fare</SheetTitle>
            {fareSheet.vehicle && (
              <p className="text-sm text-muted-foreground">
                {fareSheet.vehicle.metadata.categoryName} · {fareSheet.vehicle.vehicleNumber ?? '—'}
              </p>
            )}
          </SheetHeader>
          <div className="flex flex-col gap-6 px-8 py-6">
            <Field className="flex flex-col gap-1.5">
              <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Actual Fare (₹)
              </FieldLabel>
              <FieldContent>
                <InputGroup className="w-full">
                  <InputGroupInput
                    type="number"
                    step="0.01"
                    value={fareSheet.actualFare}
                    onChange={(e) => setFareSheet((s) => ({ ...s, actualFare: e.target.value }))}
                  />
                </InputGroup>
              </FieldContent>
            </Field>
            <Field className="flex flex-col gap-1.5">
              <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Advance Amount (₹)
              </FieldLabel>
              <FieldContent>
                <InputGroup className="w-full">
                  <InputGroupInput
                    type="number"
                    step="0.01"
                    value={fareSheet.advanceAmount}
                    onChange={(e) => setFareSheet((s) => ({ ...s, advanceAmount: e.target.value }))}
                  />
                </InputGroup>
              </FieldContent>
            </Field>
            {fareSheet.error && <p className="text-sm text-destructive">{fareSheet.error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setFareSheet((s) => ({ ...s, open: false }))}
              >
                Cancel
              </Button>
              <Button disabled={fareSheet.saving} onClick={handleSaveFare}>
                {fareSheet.saving ? 'Saving…' : 'Save Fare'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={chargesSheet.open}
        onOpenChange={(o) => setChargesSheet((s) => ({ ...s, open: o }))}
      >
        <SheetContent className="flex min-w-95 flex-col gap-0 p-0">
          <SheetHeader className="border-b border-border px-8 py-6">
            <SheetTitle>Extra Charges</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-6 px-8 py-6">
            {chargesSheet.loading ? (
              <p className="text-sm text-muted-foreground">Loading charges…</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Any extra charges, tolls, or parking fees can be added here, while the ride is in
                  progress.
                </p>
                <div className="flex flex-col gap-3">
                  {chargesSheet.chargeRows.map((row) => (
                    <div
                      key={row.key}
                      className="flex flex-col gap-2 border border-border p-3 sm:flex-row sm:items-end sm:gap-3"
                    >
                      <Field className="min-w-0 flex-1 flex-col gap-1.5">
                        <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Type
                        </FieldLabel>
                        <FieldContent>
                          <Select
                            value={row.type}
                            onValueChange={(v) =>
                              updateChargeRow(row.key, { type: v as VehicleChargeType })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={VehicleChargeType.MC_FARE}>MC Fare</SelectItem>
                              <SelectItem value={VehicleChargeType.TOLL_CHARGE}>Toll</SelectItem>
                              <SelectItem value={VehicleChargeType.PARKING_CHARGE}>
                                Parking
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldContent>
                      </Field>
                      <Field className="w-full flex-col gap-1.5 sm:w-32">
                        <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Amount (₹)
                        </FieldLabel>
                        <FieldContent>
                          <InputGroup className="w-full">
                            <InputGroupInput
                              type="number"
                              step="0.01"
                              value={
                                row.amount === null || row.amount === undefined ? '' : row.amount
                              }
                              onChange={(e) => {
                                const raw = e.target.value
                                if (raw === '') updateChargeRow(row.key, { amount: null })
                                else {
                                  const n = Number(raw)
                                  updateChargeRow(row.key, {
                                    amount: Number.isFinite(n) ? n : null,
                                  })
                                }
                              }}
                            />
                          </InputGroup>
                        </FieldContent>
                      </Field>
                      <button
                        type="button"
                        onClick={() => removeChargeRow(row.key)}
                        className="self-end text-muted-foreground hover:text-destructive sm:self-center"
                        aria-label="Remove charge row"
                      >
                        <TrashIcon className="size-5" weight="bold" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={addChargeRow}
                >
                  <PlusIcon className="mr-2 size-3.5" weight="bold" />
                  Add charge
                </Button>
                {chargesSheet.error && (
                  <p className="text-sm text-destructive">{chargesSheet.error}</p>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setChargesSheet((s) => ({ ...s, open: false }))}
                  >
                    Cancel
                  </Button>
                  <Button disabled={chargesSheet.saving} onClick={handleSaveCharges}>
                    {chargesSheet.saving ? 'Saving…' : 'Save Charges'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={vehicleSheet.open}
        onOpenChange={(o) => {
          setVehicleSheet((s) => ({ ...s, open: o, error: o ? s.error : null }))
          if (!o) setVehiclePickerList([])
        }}
      >
        <SheetContent className="flex min-w-110 flex-col gap-0 p-0">
          <SheetHeader className="border-b border-border px-8 py-6">
            <SheetTitle>
              {vehicleSheet.mode === 'add' ? 'Assign Vehicle' : 'Update Vehicle'}
            </SheetTitle>
            {vehicleSheet.mode === 'edit' && (
              <p className="text-sm text-muted-foreground">
                Change category, vehicle, or chauffeur for this assignment.
              </p>
            )}
          </SheetHeader>
          <div className="flex flex-col gap-6 px-8 py-6">
            <Field className="flex flex-col gap-1.5">
              <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Vehicle Category
              </FieldLabel>
              <FieldContent>
                <Select
                  value={vehicleSheet.categoryId?.toString() ?? ''}
                  onValueChange={(v) => void handleVehicleSheetCategoryChange(Number(v))}
                >
                  <SelectTrigger className="min-w-full">
                    <SelectValue placeholder="Select category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleSheetFleetCategoryOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>

            <Field className="flex flex-col gap-1.5">
              <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Vehicle
              </FieldLabel>
              <FieldContent>
                <Select
                  value={vehicleSheet.vehicleId?.toString() ?? ''}
                  onValueChange={(v) => setVehicleSheet((s) => ({ ...s, vehicleId: Number(v) }))}
                  disabled={vehiclePickerList.length === 0}
                >
                  <SelectTrigger className="min-w-full">
                    <SelectValue
                      placeholder={
                        vehicleSheet.categoryId ? 'Select vehicle…' : 'Select category first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {vehiclePickerList.map((veh) => (
                      <SelectItem key={veh.id} value={veh.id.toString()}>
                        {veh.brand} {veh.model} — {veh.vehicleNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>

            <Field className="flex flex-col gap-1.5">
              <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Chauffeur
              </FieldLabel>
              <FieldContent>
                <Select
                  value={vehicleSheet.chauffeurId?.toString() ?? ''}
                  onValueChange={(v) => setVehicleSheet((s) => ({ ...s, chauffeurId: Number(v) }))}
                >
                  <SelectTrigger className="min-w-full">
                    <SelectValue placeholder="Select chauffeur…" />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.chauffeurs.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>

            {vehicleSheet.error && <p className="text-sm text-destructive">{vehicleSheet.error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setVehicleSheet((s) => ({ ...s, open: false }))}
              >
                Cancel
              </Button>
              <Button
                disabled={vehicleSheet.saving || !vehicleSheet.categoryId}
                onClick={() => void handleVehicleSheetSave()}
              >
                {vehicleSheet.saving
                  ? 'Saving…'
                  : vehicleSheet.mode === 'add'
                    ? 'Assign Vehicle'
                    : 'Save changes'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
