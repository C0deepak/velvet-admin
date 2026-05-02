'use client'

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import {
  ArrowClockwiseIcon,
  GarageIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { CategoryFormSheet } from './category-form-sheet'
import { CategoryActiveBadge } from './category-badges'
import { getCategories, toggleCategoryStatus } from './api'
import type { TCategory } from './types'
import { getApiErrorMessage } from '@/helper/api-error-message'

const COLUMNS = ['Category', 'Base price (₹)', 'Status']

export default function FleetCategoriesPage() {
  const [list, setList] = useState<TCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [nameFilter, setNameFilter] = useState('')
  const [query, setQuery] = useState('')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetCategoryId, setSheetCategoryId] = useState<number | null>(null)
  const [toggleBusyId, setToggleBusyId] = useState<number | null>(null)

  const refetchList = useCallback(() => {
    return getCategories()
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
    void getCategories()
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) => c.categoryName.toLowerCase().includes(q))
  }, [list, query])

  function applySearch() {
    setQuery(nameFilter.trim())
  }

  function openNewCategory() {
    setSheetCategoryId(null)
    setSheetOpen(true)
  }

  function openEditCategory(id: number) {
    setSheetCategoryId(id)
    setSheetOpen(true)
  }

  async function onToggle(row: TCategory, e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    setToggleBusyId(row.id)
    setError(null)
    try {
      const { data } = await toggleCategoryStatus(row.id)
      setList((prev) => prev.map((c) => (c.id === data.id ? { ...c, ...data } : c)))
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setToggleBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Vehicle tiers, pricing, and package rules used across bookings.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openNewCategory}>
          <PlusIcon className="size-4" weight="bold" />
          New category
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Filter by name
          </p>
          <InputGroup className="w-full">
            <InputGroupAddon align="inline-start">
              <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="e.g. Luxury Sedan"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            />
          </InputGroup>
        </div>
        <Button type="button" variant="secondary" onClick={applySearch}>
          Search
        </Button>
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setNameFilter('')
              setQuery('')
            }}
          >
            Clear
          </Button>
        )}
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
                      Loading categories…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <GarageIcon className="size-8" weight="duotone" />
                        <p className="text-sm font-medium">
                          {list.length === 0 ? 'No categories yet' : 'No matches'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => openEditCategory(c.id)}
                      className="cursor-pointer border-b border-border/50 last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="py-3 pr-6">
                        <p className="font-medium">{c.categoryName}</p>
                        <p className="text-xs text-muted-foreground">ID {c.id}</p>
                      </td>
                      <td className="py-3 pr-6 tabular-nums">{c.basePrice.toFixed(2)}</td>
                      <td className="py-3 pr-6">
                        <CategoryActiveBadge active={c.active} />
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={toggleBusyId === c.id}
                          onClick={(e) => void onToggle(c, e)}
                        >
                          {toggleBusyId === c.id ? '…' : c.active === 1 ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && list.length > 0 && (
            <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              Showing {filtered.length} of {list.length} categories
              {query ? ` matching “${query}”` : ''}.
            </p>
          )}
        </CardContent>
      </Card>

      <CategoryFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        categoryId={sheetCategoryId}
        onSaved={() => void refetchList()}
      />
    </div>
  )
}
