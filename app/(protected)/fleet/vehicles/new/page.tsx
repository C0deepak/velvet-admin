'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { VehicleFormWizard } from '../../../vehicles/vehicle-form-wizard'

export default function NewVehiclePage() {
  const router = useRouter()

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
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">New vehicle</h1>
        <p className="text-sm text-muted-foreground">
          Step through details — mandatory fields validate per section. Images upload via secure
          presigned URLs (sub-directory VEHICLE). Optional sections stay empty until you fill them
          (stored as null).
        </p>
      </div>
      <VehicleFormWizard
        mode="create"
        onSaved={(v) => router.replace(`/fleet/vehicles/details?id=${v.id}`)}
      />
    </div>
  )
}
