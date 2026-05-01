'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { ChauffeurFormWizard } from '../chauffeur-form-wizard'

export default function NewChauffeurPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-1 px-2" asChild>
          <Link href="/chauffeurs">
            <ArrowLeftIcon className="size-4" weight="bold" />
            Chauffeurs
          </Link>
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">New chauffeur</h1>
        <p className="text-sm text-muted-foreground">
          Complete each step — required items are starred. Documents upload via secure presigned
          URLs.
        </p>
      </div>
      <ChauffeurFormWizard
        mode="create"
        onSaved={(c) => router.replace(`/chauffeurs/details?id=${c.id}`)}
      />
    </div>
  )
}
