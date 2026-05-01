'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeftIcon, ProhibitIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getChauffeurById, toggleBlockChauffeur } from '../api'
import type { TChauffeur } from '../types'
import { getApiErrorMessage } from '@/helper/api-error-message'
import { ChauffeurFormWizard } from '../chauffeur-form-wizard'
import { ChauffeurAccountStatusBadge, ChauffeurRatingBadge } from '../chauffeur-badges'

function ChauffeurDetailBody() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const idRaw = searchParams.get('id')
  const id = idRaw ? Number(idRaw) : NaN

  const [chauffeur, setChauffeur] = useState<TChauffeur | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [blockBusy, setBlockBusy] = useState(false)

  const reload = useCallback((): Promise<void> => {
    if (!Number.isFinite(id)) {
      setLoading(false)
      setErr('Invalid chauffeur id')
      setChauffeur(null)
      return Promise.resolve()
    }
    queueMicrotask(() => {
      setLoading(true)
      setErr(null)
    })
    return getChauffeurById(id)
      .then(({ data }) => setChauffeur(data))
      .catch((e) => setErr(getApiErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!Number.isFinite(id)) {
      queueMicrotask(() => {
        setLoading(false)
        setErr('Invalid chauffeur id')
        setChauffeur(null)
      })
      return
    }

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
        setErr(null)
      }
    })

    void getChauffeurById(id)
      .then(({ data }) => {
        if (!cancelled) setChauffeur(data)
      })
      .catch((e) => {
        if (!cancelled) setErr(getApiErrorMessage(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  async function onToggleBlock() {
    if (!Number.isFinite(id)) return
    setBlockBusy(true)
    try {
      await toggleBlockChauffeur(id)
      await reload()
    } catch (e) {
      setErr(getApiErrorMessage(e))
    } finally {
      setBlockBusy(false)
    }
  }

  function onSaved(updated: TChauffeur) {
    setChauffeur(updated)
  }

  if (!Number.isFinite(id)) {
    return (
      <div className="rounded-none border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Missing or invalid chauffeur id.{` `}
        <Link href="/chauffeurs" className="underline">
          Back to list
        </Link>
      </div>
    )
  }

  if (loading && !chauffeur)
    return <p className="text-sm text-muted-foreground">Loading chauffeur…</p>

  if (err && !chauffeur)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-destructive">{err}</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/chauffeurs')}>
          Back to list
        </Button>
      </div>
    )

  if (!chauffeur) return null

  const fullName = [chauffeur.firstName, chauffeur.lastName].filter(Boolean).join(' ')

  const national = chauffeur.phone?.startsWith(chauffeur.countryCode)
    ? chauffeur.phone.slice(chauffeur.countryCode.length)
    : (chauffeur.phone ?? '')

  const phoneLine = `+${chauffeur.countryCode} ${national}`

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1 px-2" asChild>
            <Link href="/chauffeurs">
              <ArrowLeftIcon className="size-4" weight="bold" />
              Chauffeurs
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            disabled={blockBusy}
            onClick={() => void onToggleBlock()}
          >
            <ProhibitIcon className="size-4" weight="bold" />
            {chauffeur.blocked ? 'Unblock' : 'Block'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-5 pt-6">
          <div className="flex flex-col gap-3 border-b border-border pb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="font-heading text-2xl font-bold tracking-tight">
                  {fullName || '—'}
                </h1>
                <p className="text-sm text-muted-foreground">{phoneLine}</p>
                {chauffeur.email ? (
                  <p className="text-sm text-muted-foreground">{chauffeur.email}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ChauffeurAccountStatusBadge blocked={chauffeur.blocked} />
                <ChauffeurRatingBadge rating={chauffeur.rating} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-semibold tracking-tight">Profile & onboarding</h2>
        <p className="text-sm text-muted-foreground">
          Update licence, documents, bank, or work-hours data — same wizard as onboarding.
        </p>
      </div>

      <ChauffeurFormWizard mode="edit" chauffeurId={id} onSaved={onSaved} />
    </div>
  )
}

export default function ChauffeurDetailsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading chauffeur…</p>}>
      <ChauffeurDetailBody />
    </Suspense>
  )
}
