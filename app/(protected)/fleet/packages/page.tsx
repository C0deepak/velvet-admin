'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowClockwiseIcon, PackageIcon, PlusIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { HourlyPackageFormSheet } from './hourly-package-form-sheet'
import { getHourlyPackages } from './api'
import type { THourlyPackage } from './types'
import { getApiErrorMessage } from '@/helper/api-error-message'

const COLUMNS = ['Package', 'Duration', 'Included km', 'Priced categories']

export default function FleetPackagesPage() {
  const [list, setList] = useState<THourlyPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<THourlyPackage | null>(null)

  const refetchList = useCallback(() => {
    return getHourlyPackages()
      .then((res) => {
        setList(res.data)
      })
      .catch((err) => setError(getApiErrorMessage(err)))
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })
    void getHourlyPackages()
      .then((res) => {
        if (cancelled) return
        queueMicrotask(() => {
          if (!cancelled) setList(res.data)
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
  }, [])

  const sorted = useMemo(
    () =>
      [...list].sort((a, b) => {
        if (a.hours !== b.hours) return a.hours - b.hours
        return a.km - b.km
      }),
    [list]
  )

  function openNew() {
    setEditTarget(null)
    setSheetOpen(true)
  }

  function openEdit(pkg: THourlyPackage) {
    setEditTarget(pkg)
    setSheetOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Hourly packages</h1>
          <p className="text-sm text-muted-foreground">
            Slabs of hours and kilometers with optional per–vehicle-category base fares.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openNew}>
          <PlusIcon className="size-4" weight="bold" />
          New package
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto gap-1.5"
              disabled={loading}
              onClick={() => void refetchList()}
            >
              <ArrowClockwiseIcon className="size-4" />
              Refresh
            </Button>
          </div>
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
                  <th className="pb-3 pr-0 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length + 1}
                      className="py-16 text-center text-sm text-muted-foreground"
                    >
                      Loading packages…
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <PackageIcon className="size-8" weight="duotone" />
                        <p className="text-sm font-medium">No hourly packages yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sorted.map((p) => (
                    <tr
                      key={p.packageId}
                      onClick={() => openEdit(p)}
                      className="cursor-pointer border-b border-border/50 last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="py-3 pr-6">
                        <p className="font-medium tabular-nums">#{p.packageId}</p>
                      </td>
                      <td className="py-3 pr-6 tabular-nums">
                        {p.hours} {p.hours === 1 ? 'hour' : 'hours'}
                      </td>
                      <td className="py-3 pr-6 tabular-nums">{p.km} km</td>
                      <td className="py-3 pr-6 tabular-nums">{p.vehicleCategoryPricing.length}</td>
                      <td className="py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(p)
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && sorted.length > 0 && (
            <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              {sorted.length} package{sorted.length === 1 ? '' : 's'}.
            </p>
          )}
        </CardContent>
      </Card>

      <HourlyPackageFormSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o)
          if (!o) setEditTarget(null)
        }}
        hourlyPackage={editTarget}
        onSaved={() => void refetchList()}
      />
    </div>
  )
}
