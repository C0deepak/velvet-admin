'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CarIcon, PlusIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FleetTableThumb } from '../fleet-table-thumb'
import { getCategories } from '../categories/api'
import { getVehicles } from './api'
import type { TCategory } from '../categories/types'
import type { TVehicle } from './types'
import { getApiErrorMessage } from '@/helper/api-error-message'
import { VehicleAvailableBadge } from './vehicle-badges'

const COLS = ['Photo', 'Vehicle', 'Category', 'Fuel', 'Seats', 'Status']

export default function FleetVehiclesPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<TVehicle[]>([])
  const [categories, setCategories] = useState<TCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })
    Promise.all([getVehicles(), getCategories()])
      .then(([vr, cr]) => {
        if (cancelled) return
        queueMicrotask(() => {
          if (cancelled) return
          setVehicles(vr.data)
          setCategories(cr.data)
        })
      })
      .catch((e) => {
        if (!cancelled) queueMicrotask(() => setError(getApiErrorMessage(e)))
      })
      .finally(() => {
        if (!cancelled) queueMicrotask(() => setLoading(false))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const catName = useMemo(() => {
    const m = new Map(categories.map((c) => [c.id, c.categoryName]))
    return (id: number) => m.get(id) ?? `Category ${id}`
  }, [categories])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-sm text-muted-foreground">
            Fleet registry, paperwork, tenure, and service records.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" asChild>
          <Link href="/fleet/vehicles/new">
            <PlusIcon className="size-4" weight="bold" />
            New vehicle
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {COLS.map((c) => (
                    <th
                      key={c}
                      className="pb-3 pr-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground last:pr-0"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={COLS.length} className="py-16 text-center text-muted-foreground">
                      Loading vehicles…
                    </td>
                  </tr>
                ) : vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <CarIcon className="size-8" weight="duotone" />
                        <p className="text-sm font-medium">No vehicles yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v) => (
                    <tr
                      key={v.id}
                      onClick={() => router.push(`/fleet/vehicles/details?id=${v.id}`)}
                      className="cursor-pointer border-b border-border/50 last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="py-3 pr-4 align-middle">
                        <FleetTableThumb
                          src={v.imageUrl}
                          alt={`${v.brand} ${v.model}`.trim() || v.vehicleNumber}
                        />
                      </td>
                      <td className="py-3 pr-6 align-middle">
                        <p className="font-medium tabular-nums">{v.vehicleNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.brand} {v.model}
                        </p>
                      </td>
                      <td className="py-3 pr-6 text-muted-foreground">{catName(v.categoryId)}</td>
                      <td className="py-3 pr-6">{v.fuelType}</td>
                      <td className="py-3 pr-6 tabular-nums">{v.seatingCapacity}</td>
                      <td className="py-3">
                        <VehicleAvailableBadge available={v.available} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
