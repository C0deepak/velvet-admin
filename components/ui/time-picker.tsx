'use client'

import { useState } from 'react'
import { ClockIcon } from '@phosphor-icons/react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

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
  const selectedHour = parts[0] !== undefined ? parseInt(parts[0]) : null
  const selectedMinute = parts[1] !== undefined ? parseInt(parts[1]) : null

  function pick(h: number | null, m: number | null) {
    const hr = h ?? selectedHour ?? 0
    const min = m ?? selectedMinute ?? 0
    onChange(`${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
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
          <span className={cn('flex-1', !value && 'text-muted-foreground')}>
            {value
              ? `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`
              : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col border-r border-border">
            <p className="border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Hour
            </p>
            <div className="h-52 overflow-auto">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => pick(h, null)}
                  className={cn(
                    'flex w-full items-center justify-center px-6 py-1.5 text-sm tabular-nums transition-colors hover:bg-muted',
                    selectedHour === h && 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {String(h).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <p className="border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Min
            </p>
            <div className="h-52 overflow-auto">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => pick(null, m)}
                  className={cn(
                    'flex w-full items-center justify-center px-6 py-1.5 text-sm tabular-nums transition-colors hover:bg-muted',
                    selectedMinute === m && 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
