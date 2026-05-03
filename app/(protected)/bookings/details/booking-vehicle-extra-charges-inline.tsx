'use client'

import { useEffect, useMemo, useState } from 'react'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VehicleChargeType } from '../schema'
import type { TVehicleCharge, TBookingVehicleAdditionalCharges } from '../types'
import { getBookingVehicleCharges, updateBookingVehicleCharges } from '../api'
import { getApiErrorMessage } from '@/helper/api-error-message'

type ChargeRow = { key: string; type: VehicleChargeType; amount: number | null }

function mergeChargePayload(rows: ChargeRow[]): TVehicleCharge[] {
  return rows
    .filter(
      (r): r is ChargeRow & { amount: number } =>
        typeof r.amount === 'number' && Number.isFinite(r.amount)
    )
    .map((r) => ({ type: r.type, amount: r.amount }))
}

const chargeTypeLabels: Record<VehicleChargeType, string> = {
  [VehicleChargeType.MC_FARE]: 'MC fare',
  [VehicleChargeType.TOLL_CHARGE]: 'Toll',
  [VehicleChargeType.PARKING_CHARGE]: 'Parking',
}

function ChargeRowCompact({
  row,
  disabled,
  onPatch,
  onRemove,
}: {
  row: ChargeRow
  disabled: boolean
  onPatch: (patch: Partial<{ type: VehicleChargeType; amount: number | null }>) => void
  onRemove: () => void
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-end gap-2 sm:flex-nowrap">
      <Select
        value={row.type}
        onValueChange={(v) => onPatch({ type: v as VehicleChargeType })}
        disabled={disabled}
      >
        <SelectTrigger
          className="h-9 w-full min-w-0 flex-1 rounded-none border-border px-2 text-xs"
          aria-label="Extra type"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={VehicleChargeType.MC_FARE}>{chargeTypeLabels.MC_FARE}</SelectItem>
          <SelectItem value={VehicleChargeType.TOLL_CHARGE}>
            {chargeTypeLabels.TOLL_CHARGE}
          </SelectItem>
          <SelectItem value={VehicleChargeType.PARKING_CHARGE}>
            {chargeTypeLabels.PARKING_CHARGE}
          </SelectItem>
        </SelectContent>
      </Select>
      <InputGroup className="w-full shrink-0 rounded-none border-border sm:w-28 [&:has(input:focus-visible)]:ring-1 [&:has(input:focus-visible)]:ring-ring">
        <span className="select-none px-2 text-muted-foreground" aria-hidden>
          ₹
        </span>
        <InputGroupInput
          type="number"
          inputMode="decimal"
          step="0.01"
          disabled={disabled}
          aria-label="Amount in rupees"
          className="h-9 min-w-0 border-0 text-xs tabular-nums shadow-none focus-visible:ring-0"
          placeholder="0"
          value={row.amount === null || row.amount === undefined ? '' : row.amount}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') onPatch({ amount: null })
            else {
              const n = Number(raw)
              onPatch({ amount: Number.isFinite(n) ? n : null })
            }
          }}
        />
      </InputGroup>
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        className="flex size-9 shrink-0 items-center justify-center rounded-none border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:opacity-45"
        aria-label="Remove charge"
      >
        <TrashIcon className="size-4" weight="bold" />
      </button>
    </div>
  )
}

function ReadOnlyVehicleExtras({
  additionalCharges,
  totalAdditionalAmount,
}: {
  additionalCharges: TBookingVehicleAdditionalCharges
  totalAdditionalAmount: number
}) {
  const lines: string[] = []
  if ((additionalCharges.mcFare ?? 0) !== 0) {
    lines.push(`MC ₹${additionalCharges.mcFare.toLocaleString('en-IN')}`)
  }
  if ((additionalCharges.waitingCharge ?? 0) !== 0) {
    lines.push(`Waiting ₹${additionalCharges.waitingCharge.toLocaleString('en-IN')}`)
  }
  if ((additionalCharges.parkingCharge ?? 0) !== 0) {
    lines.push(`Parking ₹${additionalCharges.parkingCharge.toLocaleString('en-IN')}`)
  }
  return (
    <div className="space-y-3">
      {lines.length > 0 ? (
        <p className="text-xs leading-snug text-foreground">{lines.join(' · ')}</p>
      ) : (
        <p className="text-xs text-muted-foreground">No extras recorded.</p>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Extras total (this vehicle)
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          ₹{totalAdditionalAmount.toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  )
}

export type BookingVehicleExtraChargesInlineProps =
  | {
      bookingVehicleId: number
      readOnly: true
      additionalCharges: TBookingVehicleAdditionalCharges
      totalAdditionalAmount: number
    }
  | {
      bookingVehicleId: number
      readOnly: false
      onChargesSaved: () => void
    }

function VehicleChargesEditor({
  bookingVehicleId,
  onChargesSaved,
}: {
  bookingVehicleId: number
  onChargesSaved: () => void
}) {
  const [rows, setRows] = useState<ChargeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data } = await getBookingVehicleCharges(bookingVehicleId)
        if (cancelled) return
        const next: ChargeRow[] = data.map((c, i) => ({
          key: `${c.type}_${i}`,
          type: c.type,
          amount: c.amount,
        }))
        if (next.length === 0) {
          next.push({ key: 'mc_default', type: VehicleChargeType.MC_FARE, amount: null })
        }
        setRows(next)
      } catch {
        if (!cancelled) {
          setRows([{ key: 'mc_default', type: VehicleChargeType.MC_FARE, amount: null }])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [bookingVehicleId])

  const draftTotal = useMemo(
    () =>
      rows.reduce(
        (sum, r) =>
          typeof r.amount === 'number' && Number.isFinite(r.amount) ? sum + r.amount : sum,
        0
      ),
    [rows]
  )

  function updateRow(
    key: string,
    patch: Partial<{ type: VehicleChargeType; amount: number | null }>
  ) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    setError(null)
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        key: `new_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        type: VehicleChargeType.PARKING_CHARGE,
        amount: null,
      },
    ])
    setError(null)
  }

  function removeRow(key: string) {
    setRows((prev) => {
      const next = prev.filter((r) => r.key !== key)
      return next.length > 0
        ? next
        : [{ key: `fallback_${Date.now()}`, type: VehicleChargeType.MC_FARE, amount: null }]
    })
    setError(null)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await updateBookingVehicleCharges(bookingVehicleId, mergeChargePayload(rows))
      onChargesSaved()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading extras…</p>
      ) : (
        <>
          <div className="grid gap-2">
            {rows.map((row) => (
              <ChargeRowCompact
                key={row.key}
                row={row}
                disabled={saving}
                onPatch={(patch) => updateRow(row.key, patch)}
                onRemove={() => removeRow(row.key)}
              />
            ))}
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={addRow}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <PlusIcon className="size-3.5" weight="bold" />
            Add row
          </button>

          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Extras total (this vehicle)
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums leading-none text-foreground">
                ₹{draftTotal.toLocaleString('en-IN')}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="rounded-none px-6"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? 'Saving…' : 'Save extras'}
            </Button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </>
      )}
    </div>
  )
}

/** Inline `/booking/vehicles/:id/charges` UI under each assignment — compact rows, total, save (no sheet). */
export function BookingVehicleExtraChargesInline(props: BookingVehicleExtraChargesInlineProps) {
  if (props.readOnly) {
    return (
      <ReadOnlyVehicleExtras
        additionalCharges={props.additionalCharges}
        totalAdditionalAmount={props.totalAdditionalAmount}
      />
    )
  }
  return (
    <VehicleChargesEditor
      bookingVehicleId={props.bookingVehicleId}
      onChargesSaved={props.onChargesSaved}
    />
  )
}
