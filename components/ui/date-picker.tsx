'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from '@phosphor-icons/react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

type DatePickerProps = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date…',
  error,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const date = value ? new Date(value + 'T00:00:00') : undefined

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
          <CalendarIcon
            className={cn(
              'size-3.5 shrink-0',
              error && !value ? 'text-destructive' : 'text-muted-foreground'
            )}
          />
          <span className={cn('flex-1', !date && 'text-muted-foreground')}>
            {date ? format(date, 'dd MMM yyyy') : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, 'yyyy-MM-dd'))
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
