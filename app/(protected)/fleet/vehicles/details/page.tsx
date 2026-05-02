'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { VehicleFormWizard } from '../vehicle-form-wizard'
import type { TVehicle } from '../types'
import { getVehicleById } from '../api'
import { VehicleAvailableBadge } from '../vehicle-badges'
import { getApiErrorMessage } from '@/helper/api-error-message'

function VehicleDetailInner() {
  const searchParams = useSearchParams()
  const idRaw = searchParams.get('id')
  const id = idRaw ? Number(idRaw) : NaN

  const [vehicle, setVehicle] = useState<TVehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!Number.isFinite(id)) {
      setVehicle(null)
      setErr('Invalid vehicle id')
      setLoading(false)
      return Promise.resolve()
    }
    queueMicrotask(() => {
      setLoading(true)
      setErr(null)
    })
    return getVehicleById(id)
      .then(({ data }) => setVehicle(data))
      .catch((e) => setErr(getApiErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const t = setTimeout(() => {
      void reload()
    }, 0)
    return () => clearTimeout(t)
  }, [reload])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-1 px-2" asChild>
          <Link href="/fleet/vehicles">
            <ArrowLeftIcon className="size-4" weight="bold" />
            Vehicles
          </Link>
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      )}

      {!loading && err && <p className="text-sm text-destructive">{err}</p>}

      {!loading && vehicle && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-2xl font-bold tracking-tight tabular-nums">
                {vehicle.vehicleNumber}
              </h1>
              <p className="text-sm text-muted-foreground">
                {vehicle.brand} {vehicle.model} · {vehicle.fuelType} · {vehicle.transmission}
              </p>
            </div>
            <VehicleAvailableBadge available={vehicle.available} />
          </div>
          <VehicleFormWizard
            mode="edit"
            vehicleId={vehicle.id}
            onSaved={(updated) => {
              setVehicle(updated)
              void reload()
            }}
          />
        </>
      )}
    </div>
  )
}

export default function VehicleDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader />
        </div>
      }
    >
      <VehicleDetailInner />
    </Suspense>
  )
}
