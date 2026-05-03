'use client'

import { CaretDownIcon } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { BookingStatus, PaymentStatus, TripType } from './schema'

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'Pending',
  [BookingStatus.REQUESTED]: 'Requested',
  [BookingStatus.CONFIRMED]: 'Confirmed',
  [BookingStatus.IN_PROGRESS]: 'In progress',
  [BookingStatus.COMPLETED]: 'Completed',
  [BookingStatus.CANCELLED_BY_ADMIN]: 'Cancelled',
}

export const BOOKING_STATUS_BADGE_CLASSES: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]:
    'px-2 py-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 border',
  [BookingStatus.REQUESTED]:
    'px-2 py-1 bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20 border',
  [BookingStatus.CONFIRMED]:
    'px-2 py-1 border border-blue-600/35 bg-blue-500/15 text-blue-950 dark:border-blue-400/40 dark:bg-blue-500/12 dark:text-blue-100',
  [BookingStatus.IN_PROGRESS]:
    'px-2 py-1 border border-indigo-600/35 bg-indigo-500/15 text-indigo-950 dark:border-indigo-400/40 dark:bg-indigo-500/12 dark:text-indigo-100',
  [BookingStatus.COMPLETED]:
    'px-2 py-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 border',
  [BookingStatus.CANCELLED_BY_ADMIN]:
    'px-2 py-1 bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 border',
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge variant="outline" className={BOOKING_STATUS_BADGE_CLASSES[status]} asChild={false}>
      {BOOKING_STATUS_LABEL[status]}
    </Badge>
  )
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  [PaymentStatus.PAID]: 'Paid',
  [PaymentStatus.PENDING]: 'Unpaid',
  [PaymentStatus.PARTIAL]: 'Partial',
}

export const PAYMENT_STATUS_BADGE_CLASSES: Record<PaymentStatus, string> = {
  [PaymentStatus.PAID]:
    'px-2 py-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 border',
  [PaymentStatus.PENDING]:
    'px-2 py-1 bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 border',
  [PaymentStatus.PARTIAL]:
    'px-2 py-1 bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/25 border',
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant="outline" className={PAYMENT_STATUS_BADGE_CLASSES[status]} asChild={false}>
      {PAYMENT_STATUS_LABEL[status]}
    </Badge>
  )
}

export const TRIP_TYPE_LABEL: Record<TripType, string> = {
  [TripType.ONE_WAY]: 'One Way',
  [TripType.AIRPORT_TRANSFER]: 'Airport',
  [TripType.HOURLY_RENTALS]: 'Hourly',
}

export const TRIP_TYPE_BADGE_CLASSES: Record<TripType, string> = {
  [TripType.ONE_WAY]:
    'px-2 py-1 border border-dashed border-slate-400/85 bg-slate-500/[0.07] font-medium text-slate-800 dark:border-zinc-500/50 dark:bg-zinc-500/15 dark:text-zinc-50',
  [TripType.AIRPORT_TRANSFER]:
    'px-2 py-1 border border-dashed border-cyan-600/45 bg-cyan-500/[0.1] font-medium text-cyan-950 dark:border-cyan-400/55 dark:bg-cyan-400/12 dark:text-cyan-50',
  [TripType.HOURLY_RENTALS]:
    'px-2 py-1 border border-dashed border-fuchsia-600/45 bg-fuchsia-500/[0.1] font-medium text-fuchsia-950 dark:border-fuchsia-400/55 dark:bg-fuchsia-400/12 dark:text-fuchsia-50',
}

export function TripTypeBadge({ tripType }: { tripType: TripType }) {
  return (
    <Badge variant="outline" className={TRIP_TYPE_BADGE_CLASSES[tripType]} asChild={false}>
      {TRIP_TYPE_LABEL[tripType]}
    </Badge>
  )
}

function paymentLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABEL[status] ?? String(status)
}

function PaymentDot({ status }: { status: PaymentStatus }) {
  const dot =
    status === PaymentStatus.PAID
      ? 'bg-green-700/35 dark:bg-green-400/40'
      : status === PaymentStatus.PENDING
        ? 'bg-red-500/35 dark:bg-red-400/40'
        : 'bg-amber-500/35 dark:bg-amber-400/40'
  return <span className={cn('size-1 shrink-0 rounded-full', dot)} aria-hidden />
}

function triggerClass(status: PaymentStatus): string {
  if (status === PaymentStatus.PAID) {
    return cn(
      'border border-green-500/25 text-green-800',
      'hover:bg-green-500/[0.13] dark:border-green-500/30 dark:text-green-400'
    )
  }
  if (status === PaymentStatus.PENDING) {
    return cn(
      'border border-red-500/25 text-red-800',
      'hover:bg-red-500/[0.13] dark:border-red-500/30 dark:text-red-400'
    )
  }
  return cn(
    'border border-amber-500/25 text-amber-800',
    'hover:bg-amber-500/[0.13] dark:border-amber-500/35 dark:text-amber-400'
  )
}

type PaymentStatusDropdownProps = {
  status: PaymentStatus
  updating?: boolean
  /** When true, the control is non-interactive (e.g. cancelled booking). */
  readOnly?: boolean
  onPaid: () => void
  onUnpaid: () => void
}

export function PaymentStatusDropdown({
  status,
  updating,
  readOnly = false,
  onPaid,
  onUnpaid,
}: PaymentStatusDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={updating || readOnly}>
        <button
          type="button"
          tabIndex={0}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-none border px-2 py-1 text-[10px] font-medium uppercase tracking-wider outline-none transition-colors',
            'focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-55',
            triggerClass(status)
          )}
        >
          <PaymentDot status={status} />
          <span>{paymentLabel(status)}</span>
          <CaretDownIcon className="size-2.5 shrink-0 text-muted-foreground/70" weight="regular" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuItem
          disabled={updating || status === PaymentStatus.PAID}
          onSelect={() => onPaid()}
        >
          Mark as paid
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={updating || status === PaymentStatus.PENDING}
          onSelect={() => onUnpaid()}
        >
          Mark as unpaid
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function FlowStepBar({ step, labels }: { step: number; labels: readonly string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-y-2">
      {labels.map((label, i) => {
        const n = i + 1
        const done = step > n
        const active = step === n
        return (
          <div key={`${label}-${n}`} className="flex items-center gap-0">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center text-[11px] font-bold transition-colors',
                  done &&
                    'bg-neutral-950 text-neutral-50 dark:bg-white/[0.12] dark:text-zinc-100 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]',
                  !done &&
                    !active &&
                    'border border-neutral-400/55 bg-muted/65 text-muted-foreground dark:border-white/14 dark:bg-white/[0.04] dark:text-zinc-400',
                  active &&
                    !done &&
                    'border border-transparent bg-primary text-primary-foreground ring-2 ring-primary/20 dark:bg-primary dark:text-primary-foreground dark:ring-primary/35'
                )}
              >
                {done ? '✓' : n}
              </div>
              <span
                className={cn(
                  'max-w-[9rem] text-xs font-medium transition-colors sm:max-w-none',
                  active
                    ? 'text-foreground dark:text-zinc-50'
                    : 'text-muted-foreground dark:text-zinc-500'
                )}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div
                className={cn(
                  'mx-3 h-px w-8 shrink-0 transition-colors',
                  step > n ? 'bg-neutral-950 dark:bg-primary/60' : 'bg-border dark:bg-white/14'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
