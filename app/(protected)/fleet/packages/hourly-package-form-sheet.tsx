'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { TCategory } from '../categories/types'
import { getCategories } from '../categories/api'
import type { THourlyPackage, THourlyPackageWrite } from './types'
import { hourlyPackageWriteSchema } from './schema'
import { createHourlyPackage, updateHourlyPackage } from './api'
import { getApiErrorMessage } from '@/helper/api-error-message'

const CATEGORY_UNSET = '__unset__'

type PriceRow = {
  key: string
  categoryId: number | null
  basePrice: number | null
  /** Carried from API or selection so save works if category list fails to load. */
  categoryName?: string
}

function newRow(): PriceRow {
  return {
    key: `row_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    categoryId: null,
    basePrice: null,
  }
}

function rowsFromPackage(pkg: THourlyPackage): PriceRow[] {
  return pkg.vehicleCategoryPricing.map((p) => ({
    key: `pkg_${p.categoryId}_${Math.random().toString(36).slice(2, 7)}`,
    categoryId: p.categoryId,
    basePrice: p.basePrice,
    categoryName: p.categoryName,
  }))
}

type HourlyPackageFormSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` — create; otherwise edit that package. */
  hourlyPackage: THourlyPackage | null
  onSaved?: (pkg: THourlyPackage) => void
}

export function HourlyPackageFormSheet({
  open,
  onOpenChange,
  hourlyPackage,
  onSaved,
}: HourlyPackageFormSheetProps) {
  const [categories, setCategories] = useState<TCategory[]>([])
  const [catErr, setCatErr] = useState<string | null>(null)
  const [hours, setHours] = useState(1)
  const [km, setKm] = useState(10)
  const [rows, setRows] = useState<PriceRow[]>([])
  const [rootErr, setRootErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isEdit = hourlyPackage != null

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.categoryName.localeCompare(b.categoryName)),
    [categories]
  )

  const categoryById = useMemo(() => {
    const m = new Map<number, TCategory>()
    for (const c of categories) m.set(c.id, c)
    return m
  }, [categories])

  const resetDraft = useCallback(() => {
    if (hourlyPackage) {
      setHours(hourlyPackage.hours)
      setKm(hourlyPackage.km)
      setRows(rowsFromPackage(hourlyPackage))
    } else {
      setHours(1)
      setKm(10)
      setRows([])
    }
    setRootErr(null)
  }, [hourlyPackage])

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setCatErr(null)
        setRootErr(null)
      })
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      resetDraft()
      setCatErr(null)
      void getCategories()
        .then((res) => {
          if (!cancelled) setCategories(res.data)
        })
        .catch((e) => {
          if (!cancelled) setCatErr(getApiErrorMessage(e))
        })
    })
    return () => {
      cancelled = true
    }
  }, [open, hourlyPackage, resetDraft])

  function rowSelectValue(r: PriceRow) {
    return r.categoryId === null ? CATEGORY_UNSET : String(r.categoryId)
  }

  function selectableCategoriesForRow(row: PriceRow): TCategory[] {
    const taken = new Set(
      rows
        .filter((x) => x.key !== row.key)
        .map((x) => x.categoryId)
        .filter(Boolean) as number[]
    )
    return sortedCategories.filter((c) => !taken.has(c.id) || c.id === row.categoryId)
  }

  function updateRow(
    key: string,
    patch: Partial<Pick<PriceRow, 'categoryId' | 'basePrice' | 'categoryName'>>
  ) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()])
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key))
  }

  function buildWriteBody():
    | { ok: true; body: THourlyPackageWrite }
    | { ok: false; message: string } {
    const pricing: THourlyPackageWrite['vehicleCategoryPricing'] = []
    for (const r of rows) {
      const bothEmpty = r.categoryId === null && r.basePrice === null
      if (bothEmpty) continue
      if (r.categoryId === null || r.basePrice === null) {
        return {
          ok: false,
          message: 'Each pricing line needs a category and a base price (or remove the row).',
        }
      }
      if (!Number.isFinite(r.basePrice) || r.basePrice < 0) {
        return { ok: false, message: 'Base prices must be valid numbers ≥ 0.' }
      }
      const name = categoryById.get(r.categoryId)?.categoryName ?? r.categoryName?.trim()
      if (!name) {
        return { ok: false, message: 'Unknown category on a row — pick a category again.' }
      }
      pricing.push({
        categoryId: r.categoryId,
        categoryName: name,
        basePrice: r.basePrice,
      })
    }

    const parsed = hourlyPackageWriteSchema.safeParse({
      hours,
      km,
      vehicleCategoryPricing: pricing,
    })
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Invalid package'
      return { ok: false, message: msg }
    }
    return { ok: true, body: parsed.data }
  }

  async function handleSubmit() {
    setRootErr(null)
    const built = buildWriteBody()
    if (!built.ok) {
      setRootErr(built.message)
      return
    }
    setSaving(true)
    try {
      if (!isEdit) {
        const { data } = await createHourlyPackage(built.body)
        onSaved?.(data)
        onOpenChange(false)
        return
      }
      const { data } = await updateHourlyPackage(hourlyPackage.packageId, built.body)
      onSaved?.(data)
      onOpenChange(false)
    } catch (e) {
      setRootErr(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-6">
          <SheetTitle>{isEdit ? 'Edit hourly package' : 'New hourly package'}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-6 py-6">
          <p className="text-xs text-muted-foreground">
            Set duration and included distance. Add only the vehicle categories you want priced for
            this slab — you do not need a row for every category.
          </p>

          {catErr && <p className="text-sm text-destructive">{catErr}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field className="flex flex-col gap-1.5">
              <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Hours
              </FieldLabel>
              <FieldContent>
                <InputGroup className="w-full">
                  <InputGroupInput
                    type="number"
                    min={1}
                    step={1}
                    value={hours}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      setHours(Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1)
                    }}
                  />
                </InputGroup>
              </FieldContent>
            </Field>
            <Field className="flex flex-col gap-1.5">
              <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Included km
              </FieldLabel>
              <FieldContent>
                <InputGroup className="w-full">
                  <InputGroupInput
                    type="number"
                    min={0}
                    step={1}
                    value={km}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      setKm(Number.isFinite(n) ? Math.max(0, n) : 0)
                    }}
                  />
                </InputGroup>
              </FieldContent>
            </Field>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Base price by category (₹)
            </p>
            {rows.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                No category prices yet. Use &quot;Add category&quot; to attach optional per-category
                rates.
              </p>
            ) : (
              rows.map((row) => (
                <div
                  key={row.key}
                  className="flex flex-col gap-2 border border-border p-3 sm:flex-row sm:items-end sm:gap-3"
                >
                  <Field className="min-w-0 flex-1 flex-col gap-1.5">
                    <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Category
                    </FieldLabel>
                    <FieldContent>
                      <Select
                        value={rowSelectValue(row)}
                        onValueChange={(v) => {
                          if (v === CATEGORY_UNSET) {
                            updateRow(row.key, { categoryId: null, categoryName: undefined })
                          } else {
                            const id = Number(v)
                            updateRow(row.key, {
                              categoryId: id,
                              categoryName: categoryById.get(id)?.categoryName,
                            })
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={CATEGORY_UNSET}>—</SelectItem>
                          {selectableCategoriesForRow(row).map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.categoryName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldContent>
                  </Field>
                  <Field className="w-full flex-col gap-1.5 sm:w-36">
                    <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Base price (₹)
                    </FieldLabel>
                    <FieldContent>
                      <InputGroup className="w-full">
                        <InputGroupInput
                          type="number"
                          step="0.01"
                          min={0}
                          value={
                            row.basePrice === null || row.basePrice === undefined
                              ? ''
                              : row.basePrice
                          }
                          onChange={(e) => {
                            const raw = e.target.value
                            if (raw === '') updateRow(row.key, { basePrice: null })
                            else {
                              const n = Number(raw)
                              updateRow(row.key, { basePrice: Number.isFinite(n) ? n : null })
                            }
                          }}
                        />
                      </InputGroup>
                    </FieldContent>
                  </Field>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="self-end text-muted-foreground hover:text-destructive sm:self-center"
                    aria-label="Remove pricing row"
                  >
                    <TrashIcon className="size-5" weight="bold" />
                  </button>
                </div>
              ))
            )}
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addRow}>
              <PlusIcon className="mr-2 size-3.5" weight="bold" />
              Add category
            </Button>
          </div>

          {rootErr && <p className="text-sm text-destructive">{rootErr}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
              {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
