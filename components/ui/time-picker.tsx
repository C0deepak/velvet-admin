'use client'

import { useState } from 'react'
import { ClockIcon } from '@phosphor-icons/react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const PERIODS = ['AM', 'PM'] as const

type Period = (typeof PERIODS)[number]

function from24h(hour24: number): { h12: number; period: Period } {
  const period: Period = hour24 >= 12 ? 'PM' : 'AM'
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { h12, period }
}

function to24h(h12: number, period: Period): number {
  if (period === 'AM') return h12 === 12 ? 0 : h12
  return h12 === 12 ? 12 : h12 + 12
}

function format12hDisplay(value: string): string {
  const parts = value.split(':')
  if (parts.length < 2) return value
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value
  const { h12, period } = from24h(h)
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

type TimePickerProps = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: boolean
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select time…',
  error,
}: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const parts = value ? value.split(':') : []
  const selectedHour24 = parts[0] !== undefined && parts[0] !== '' ? parseInt(parts[0], 10) : null
  const selectedMinute = parts[1] !== undefined && parts[1] !== '' ? parseInt(parts[1], 10) : null

  const resolved24 =
    selectedHour24 != null && Number.isFinite(selectedHour24)
      ? Math.min(23, Math.max(0, selectedHour24))
      : null
  const resolvedMinute =
    selectedMinute != null && Number.isFinite(selectedMinute) ? selectedMinute : null

  let displayH12: number | null = null
  let displayPeriod: Period | null = null
  if (resolved24 !== null) {
    const q = from24h(resolved24)
    displayH12 = q.h12
    displayPeriod = q.period
  }
  const displayMinute = resolvedMinute

  function commit(h12: number, minute: number, period: Period) {
    const h24 = to24h(h12, period)
    onChange(`${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
  }

  function pick(opts: { h12?: number; minute?: number; period?: Period }) {
    const h12 = opts.h12 ?? displayH12 ?? 9
    const minute =
      opts.minute !== undefined
        ? opts.minute
        : displayMinute !== null && Number.isFinite(displayMinute)
          ? displayMinute
          : 0
    const period = opts.period ?? displayPeriod ?? 'AM'
    commit(h12, minute, period)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full items-center gap-2 border-b text-left text-sm transition-colors',
            error && !value
              ? 'border-b-destructive'
              : value
                ? 'border-b-ring/40 hover:border-b-ring/60'
                : 'border-b-input hover:border-b-ring/50'
          )}
        >
          <ClockIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className={cn('flex-1 tabular-nums', !value && 'text-muted-foreground')}>
            {value ? format12hDisplay(value) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col border-r border-border">
            <p className="border-b border-border px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Hour
            </p>
            <div className="h-52 overflow-auto">
              {HOURS_12.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => pick({ h12: h })}
                  className={cn(
                    'flex w-full min-w-[3.25rem] items-center justify-center px-4 py-1.5 text-sm tabular-nums transition-colors hover:bg-muted',
                    displayH12 === h && 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col border-r border-border">
            <p className="border-b border-border px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Min
            </p>
            <div className="h-52 overflow-auto">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => pick({ minute: m })}
                  className={cn(
                    'flex w-full items-center justify-center px-5 py-1.5 text-sm tabular-nums transition-colors hover:bg-muted',
                    displayMinute === m && 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <p className="border-b border-border px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              AM / PM
            </p>
            <div className="flex h-52 flex-col justify-center">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => pick({ period: p })}
                  className={cn(
                    'flex flex-1 w-full items-center justify-center px-6 py-1.5 text-sm font-semibold tracking-wide transition-colors hover:bg-muted',
                    displayPeriod === p && 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
