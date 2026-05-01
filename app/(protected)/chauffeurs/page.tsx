'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PlusIcon, UserSoundIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { getChauffeurs } from './api'
import type { TChauffeur } from './types'
import { getApiErrorMessage } from '@/helper/api-error-message'
import { ChauffeurAccountStatusBadge, ChauffeurRatingBadge } from './chauffeur-badges'

const PAGE_SIZE = 20

const COLUMNS = ['Chauffeur', 'Email', 'License', 'Rating', 'Status']

export default function ChauffeurListPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [chauffeurs, setChauffeurs] = useState<TChauffeur[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
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
    void getChauffeurs(page, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return
        queueMicrotask(() => {
          if (cancelled) return
          setChauffeurs(res.data.data)
          setTotal(res.data.total)
          setPages(Math.max(1, res.data.pages))
        })
      })
      .catch((err) => {
        if (!cancelled) queueMicrotask(() => setError(getApiErrorMessage(err)))
      })
      .finally(() => {
        if (!cancelled) queueMicrotask(() => setLoading(false))
      })
    return () => {
      cancelled = true
    }
  }, [page])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Chauffeurs</h1>
          <p className="text-sm text-muted-foreground">
            Manage driver profiles, onboarding, and documents.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" asChild>
          <Link href="/chauffeurs/new">
            <PlusIcon className="size-4" weight="bold" />
            New chauffeur
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
                  {COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="pb-3 pr-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground last:pr-0"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      className="py-16 text-center text-sm text-muted-foreground"
                    >
                      Loading chauffeurs…
                    </td>
                  </tr>
                ) : chauffeurs.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <UserSoundIcon className="size-8" weight="duotone" />
                        <p className="text-sm font-medium">No chauffeurs found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  chauffeurs.map((c) => {
                    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || '—'
                    const national = c.phone?.startsWith(c.countryCode)
                      ? c.phone.slice(c.countryCode.length)
                      : (c.phone ?? '')
                    const phoneLine = `+${c.countryCode} ${national}`

                    return (
                      <tr
                        key={c.id}
                        onClick={() => router.push(`/chauffeurs/details?id=${c.id}`)}
                        className="cursor-pointer border-b border-border/50 last:border-0 transition-colors hover:bg-muted/30"
                      >
                        <td className="py-3 pr-6">
                          <p className="font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">{phoneLine}</p>
                        </td>
                        <td className="max-w-56 truncate py-3 pr-6 text-muted-foreground">
                          {c.email ?? '—'}
                        </td>
                        <td className="py-3 pr-6 font-mono text-xs text-muted-foreground">
                          {c.licenseNumber ?? '—'}
                        </td>
                        <td className="py-3 pr-6">
                          <ChauffeurRatingBadge rating={c.rating} />
                        </td>
                        <td className="py-3">
                          <ChauffeurAccountStatusBadge blocked={c.blocked} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={pages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            className="mt-4 border-t border-border pt-4"
          />
        </CardContent>
      </Card>
    </div>
  )
}
