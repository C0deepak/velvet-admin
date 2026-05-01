'use client'

import { AIRPORTS, AIRPORT_CITIES, type AirportCity } from '@/lib/airport-data'

export function AirportPicker({
  city,
  terminalIdx,
  onAirportChange,
}: {
  city: AirportCity
  terminalIdx: number
  onAirportChange: (city: AirportCity, terminalIdx: number) => void
}) {
  const terminal = AIRPORTS[city].terminals[terminalIdx]
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-4">
        <select
          value={city}
          onChange={(e) => {
            const c = e.target.value as AirportCity
            onAirportChange(c, 0)
          }}
          className="border-b border-b-input bg-transparent py-2 text-sm text-foreground outline-none focus:border-b-ring"
        >
          {AIRPORT_CITIES.map((c) => (
            <option key={c} value={c}>
              {AIRPORTS[c].label}
            </option>
          ))}
        </select>
        <select
          value={terminalIdx}
          onChange={(e) => onAirportChange(city, Number(e.target.value))}
          className="border-b border-b-input bg-transparent py-2 text-sm text-foreground outline-none focus:border-b-ring"
        >
          {AIRPORTS[city].terminals.map((t, i) => (
            <option key={t.placeId} value={i}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">{terminal.address}</p>
    </div>
  )
}
