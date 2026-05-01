export type AirportCity = 'Delhi' | 'Noida'

export interface AirportTerminal {
  label: string
  address: string
  placeId: string
  latitude: number
  longitude: number
}

export const AIRPORTS: Record<AirportCity, { label: string; terminals: AirportTerminal[] }> = {
  Delhi: {
    label: 'Delhi (IGI Airport)',
    terminals: [
      {
        label: 'T1',
        address: 'Terminal 1, Indira Gandhi International Airport, New Delhi, Delhi 110037',
        placeId: 'igi_del_t1',
        latitude: 28.5551,
        longitude: 77.0895,
      },
      {
        label: 'T2',
        address: 'Terminal 2, Indira Gandhi International Airport, New Delhi, Delhi 110037',
        placeId: 'igi_del_t2',
        latitude: 28.5529,
        longitude: 77.1163,
      },
      {
        label: 'T3',
        address: 'Terminal 3, Indira Gandhi International Airport, New Delhi, Delhi 110037',
        placeId: 'igi_del_t3',
        latitude: 28.5665,
        longitude: 77.1031,
      },
    ],
  },
  Noida: {
    label: 'Noida',
    terminals: [
      {
        label: 'Hindon Airport',
        address: 'Hindon Airport, Sahibabad, Ghaziabad, Uttar Pradesh 201005',
        placeId: 'hindon_airport',
        latitude: 28.6969,
        longitude: 77.4315,
      },
      {
        label: 'Jewar Airport',
        address: 'Noida International Airport, Jewar, Gautam Buddha Nagar, Uttar Pradesh',
        placeId: 'jewar_airport',
        latitude: 28.1097,
        longitude: 77.5846,
      },
    ],
  },
}

export const AIRPORT_CITIES = Object.keys(AIRPORTS) as AirportCity[]

export function findTerminal(address: string): { city: AirportCity; terminalIdx: number } | null {
  for (const city of AIRPORT_CITIES) {
    const idx = AIRPORTS[city].terminals.findIndex((t) => t.address === address)
    if (idx !== -1) return { city, terminalIdx: idx }
  }
  return null
}
