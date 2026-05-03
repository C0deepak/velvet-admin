'use client'

import { cn } from '@/lib/utils'
import { AIRPORTS, AIRPORT_CITIES, type AirportCity } from '@/lib/airport-data'

const tabButton =
  'flex min-w-0 flex-1 items-center justify-center gap-2 border px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider transition-colors'

const tabActive = 'border-primary bg-primary/10 text-primary'
const tabInactive = 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'

function cityTabLabel(city: AirportCity): string {
  return city === 'Delhi' ? 'Delhi' : 'Noida'
}

export function AirportPicker({
  city,
  terminalIdx,
  onAirportChange,
}: {
  city: AirportCity
  terminalIdx: number
  onAirportChange: (city: AirportCity, terminalIdx: number) => void
}) {
  const safeTerminalIdx = Math.min(
    Math.max(0, terminalIdx),
    Math.max(0, AIRPORTS[city].terminals.length - 1)
  )
  const resolvedTerminal = AIRPORTS[city].terminals[safeTerminalIdx]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full flex-row items-start gap-10 lg:gap-12">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Airport location
          </p>
          <div className="flex w-full gap-2">
            {AIRPORT_CITIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onAirportChange(c, 0)}
                className={cn(tabButton, city === c ? tabActive : tabInactive)}
              >
                {cityTabLabel(c)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Terminal
          </p>
          <div className="flex w-full gap-2">
            {AIRPORTS[city].terminals.map((t, i) => (
              <button
                key={t.placeId}
                type="button"
                onClick={() => onAirportChange(city, i)}
                className={cn(tabButton, safeTerminalIdx === i ? tabActive : tabInactive)}
              >
                <span className="line-clamp-2">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{resolvedTerminal.address}</p>
    </div>
  )
}
