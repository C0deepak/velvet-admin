'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarCheckIcon, PlusIcon } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { cn } from '@/lib/utils'
import { BookingProvider, useBooking, PAGE_SIZE } from './context/booking-provider'
import { BookingStatusBadge, TripTypeBadge } from './booking-badges'
import { BookingStatus, WaypointType } from './schema'
import type { TBooking } from './types'

const FILTER_TABS = [
  { label: 'All', value: 'ALL' as const },
  { label: 'Pending', value: BookingStatus.PENDING },
  { label: 'Requested', value: BookingStatus.REQUESTED },
  { label: 'Confirmed', value: BookingStatus.CONFIRMED },
  { label: 'Completed', value: BookingStatus.COMPLETED },
  { label: 'Cancelled', value: BookingStatus.CANCELLED_BY_ADMIN },
]

const COLUMNS = ['Reference', 'Customer', 'Trip', 'Route', 'Date', 'Status']

function BookingRow({ booking }: { booking: TBooking }) {
  const router = useRouter()
  const wps = booking.waypoints
  const pickup = wps.find((w) => w.type === WaypointType.PICKUP)
  const dropWp = [...wps].reverse().find((w) => w.type === WaypointType.DROP)
  const routeTitle = wps.map((w) => `${w.type.replace(/_/g, ' ')}: ${w.address}`).join('\n')

  return (
    <tr
      onClick={() => router.push(`/bookings/details?id=${booking.id}`)}
      className="cursor-pointer border-b border-border/50 last:border-0 transition-colors hover:bg-muted/30"
    >
      <td className="py-3 pr-6 font-mono text-xs text-muted-foreground">
        {booking.bookingReference}
      </td>
      <td className="py-3 pr-6">
        <p className="font-medium">{booking.metadata.customerName}</p>
        <p className="text-xs text-muted-foreground">{booking.metadata.customerContact}</p>
      </td>
      <td className="py-3 pr-6">
        <TripTypeBadge tripType={booking.tripType} />
      </td>
      <td className="max-w-56 py-3 pr-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {wps.length} waypoint{wps.length === 1 ? '' : 's'}
        </p>
        <p className="truncate text-foreground" title={routeTitle}>
          {pickup?.address ?? wps[0]?.address ?? '—'}
        </p>
        <p className="truncate text-xs text-muted-foreground" title={routeTitle}>
          {dropWp?.address ?? wps[wps.length - 1]?.address ?? '—'}
        </p>
      </td>
      <td className="py-3 pr-6 whitespace-nowrap">
        <p className="text-foreground">{booking.rideDate ?? '—'}</p>
        {booking.pickupTime && (
          <p className="text-xs text-muted-foreground">{booking.pickupTime.slice(0, 5)}</p>
        )}
      </td>
      <td className="py-3">
        <BookingStatusBadge status={booking.status} />
      </td>
    </tr>
  )
}

function BookingsContent() {
  const { bookings, isLoading, activeStatus, setStatus, page, totalPages, total, setPage } =
    useBooking()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground">Manage and track all bookings.</p>
        </div>
        <Button size="sm" className="gap-1.5" asChild>
          <Link href="/bookings/new">
            <PlusIcon className="size-4" weight="bold" />
            New Booking
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={cn(
              'border px-2 py-1 text-xs font-medium transition-colors',
              activeStatus === value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="pb-3 pr-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground last:pr-0"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      className="py-16 text-center text-sm text-muted-foreground"
                    >
                      Loading bookings…
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <CalendarCheckIcon className="size-8" weight="duotone" />
                        <p className="text-sm font-medium">No bookings found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => <BookingRow key={booking.id} booking={booking} />)
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            className="mt-4 border-t border-border pt-4"
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default function BookingsPage() {
  return (
    <BookingProvider>
      <BookingsContent />
    </BookingProvider>
  )
}
