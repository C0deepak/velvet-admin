'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckIcon, MapPinIcon, PencilIcon, XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldLabel, FieldError } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { cn } from '@/lib/utils'
import type { TPlaceSuggestion } from '../types'

const PLACES_BASE = 'https://dev-api.velvetexperience.com'

const confirmPlaceFormSchema = z
  .object({
    address: z.string().min(1, 'Address is required'),
    latitude: z.string(),
    longitude: z.string(),
  })
  .superRefine((data, ctx) => {
    const latStr = data.latitude.trim()
    if (!latStr) {
      ctx.addIssue({
        code: 'custom',
        message: 'Latitude is required',
        path: ['latitude'],
      })
    } else {
      const lat = Number(latStr.replace(',', '.'))
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        ctx.addIssue({
          code: 'custom',
          message: 'Invalid latitude (-90 to 90)',
          path: ['latitude'],
        })
      }
    }
    const lngStr = data.longitude.trim()
    if (!lngStr) {
      ctx.addIssue({
        code: 'custom',
        message: 'Longitude is required',
        path: ['longitude'],
      })
    } else {
      const lng = Number(lngStr.replace(',', '.'))
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        ctx.addIssue({
          code: 'custom',
          message: 'Invalid longitude (-180 to 180)',
          path: ['longitude'],
        })
      }
    }
  })

type TConfirmPlaceFormValues = z.infer<typeof confirmPlaceFormSchema>

export type PlaceValue = {
  address: string
  placeId: string
  latitude: number | null
  longitude: number | null
}

export const EMPTY_PLACE: PlaceValue = { address: '', placeId: '', latitude: null, longitude: null }

function placeHasCoords(p: PlaceValue): boolean {
  return (
    p.latitude != null &&
    p.longitude != null &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude)
  )
}

export function isPlaceReadyForSubmit(p: PlaceValue): boolean {
  return !!p.address.trim() && !!p.placeId?.trim() && placeHasCoords(p)
}

function isPlaceConfirmed(p: PlaceValue): boolean {
  if (!p.address.trim()) return false
  return !!p.placeId?.trim() || placeHasCoords(p)
}

function hasSavedWaypointForReopen(p: PlaceValue): boolean {
  return !!p.address.trim() && placeHasCoords(p)
}

type PlaceSearchProps = {
  value: PlaceValue
  onChange: (v: PlaceValue) => void
  placeholder?: string
  error?: boolean
  preferConfirmScreen?: boolean
}

export function PlaceSearch({
  value,
  onChange,
  placeholder,
  error,
  preferConfirmScreen = false,
}: PlaceSearchProps) {
  const [open, setOpen] = useState(false)
  const [screen, setScreen] = useState<'search' | 'confirm'>('search')

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<TPlaceSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timer = useRef<any>(undefined)
  const manualPlaceSeq = useRef(0)

  const [suggestionLabel, setSuggestionLabel] = useState('')
  const [selectedPlaceId, setSelectedPlaceId] = useState('')

  const form = useForm<TConfirmPlaceFormValues>({
    resolver: zodResolver(confirmPlaceFormSchema),
    defaultValues: { address: '', latitude: '', longitude: '' },
  })

  const isConfirmed = isPlaceConfirmed(value)

  function seedConfirmFromPlace(p: PlaceValue) {
    setSuggestionLabel(p.address.trim() || placeholder || 'Place')
    setSelectedPlaceId(p.placeId.trim())
    form.reset({
      address: p.address.trim(),
      latitude: p.latitude != null && Number.isFinite(p.latitude) ? String(p.latitude) : '',
      longitude: p.longitude != null && Number.isFinite(p.longitude) ? String(p.longitude) : '',
    })
  }

  function resetDialogUi() {
    setScreen('search')
    setQuery('')
    setSuggestions([])
    setSuggestionLabel('')
    setSelectedPlaceId('')
    form.reset({ address: '', latitude: '', longitude: '' })
    clearTimeout(timer.current)
    setSearching(false)
  }

  function openDialog() {
    resetDialogUi()
    if (preferConfirmScreen && hasSavedWaypointForReopen(value)) {
      seedConfirmFromPlace(value)
      setScreen('confirm')
    }
    setOpen(true)
  }

  function dismissDialog() {
    setOpen(false)
    resetDialogUi()
  }

  function onType(text: string) {
    setQuery(text)
    clearTimeout(timer.current)
    if (!text.trim()) {
      setSuggestions([])
      return
    }
    timer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `${PLACES_BASE}/utils/google/places/search?query=${encodeURIComponent(text)}&location=28.54998,77.18908&radius=50000`
        )
        const data = await res.json()
        setSuggestions(data.suggestions ?? [])
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 350)
  }

  function onSelectSuggestion(s: TPlaceSuggestion) {
    const label = [s.mainText, s.secondaryText].filter(Boolean).join(', ')
    setSuggestionLabel(label)
    setSelectedPlaceId(s.placeId)
    form.reset({ address: label, latitude: '', longitude: '' })
    setScreen('confirm')
  }

  function onConfirm(data: TConfirmPlaceFormValues) {
    const trimmed = data.address.trim()
    const latitude = Number(data.latitude.trim().replace(',', '.'))
    const longitude = Number(data.longitude.trim().replace(',', '.'))
    let pid = selectedPlaceId && selectedPlaceId !== 'manual_coords' ? selectedPlaceId : ''
    if (!pid && value.placeId) pid = value.placeId.trim()
    if (!pid) {
      manualPlaceSeq.current += 1
      pid = `manual_${manualPlaceSeq.current}`
    }
    onChange({
      address: trimmed,
      placeId: pid,
      latitude,
      longitude,
    })
    dismissDialog()
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={cn(
          'flex h-10 w-full items-center gap-2 border-b text-left text-sm transition-colors',
          error && !isConfirmed
            ? 'border-b-destructive'
            : isConfirmed
              ? 'border-b-ring/40 hover:border-b-ring/60'
              : 'border-b-input hover:border-b-ring/50'
        )}
      >
        <MapPinIcon
          className={cn(
            'size-3.5 shrink-0',
            isConfirmed ? 'text-primary' : error ? 'text-destructive' : 'text-muted-foreground'
          )}
          weight={isConfirmed ? 'fill' : 'regular'}
        />
        <span className={cn('flex-1 truncate', !isConfirmed && 'text-muted-foreground')}>
          {isConfirmed ? value.address : (placeholder ?? 'Search address…')}
        </span>
        {preferConfirmScreen && isConfirmed && placeHasCoords(value) && (
          <span className="tabular-nums text-[10px] text-muted-foreground">
            {value.latitude!.toFixed(4)}, {value.longitude!.toFixed(4)}
          </span>
        )}
        {isConfirmed && (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange(EMPTY_PLACE)
            }}
            className="text-muted-foreground hover:text-destructive"
          >
            <XIcon className="size-3.5" />
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && dismissDialog()}>
        <DialogContent className="gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
          {screen === 'search' && (
            <>
              <DialogHeader className="flex-row items-center justify-between border-b border-border px-6 py-4">
                <DialogTitle>Search Place</DialogTitle>
                <button
                  type="button"
                  onClick={dismissDialog}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </button>
              </DialogHeader>

              <div className="flex items-center gap-2 border-b border-border px-6 py-3">
                <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => onType(e.target.value)}
                  placeholder="Type to search places…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {searching && (
                  <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                )}
              </div>

              <div className="max-h-72 overflow-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.placeId}
                    type="button"
                    onClick={() => onSelectSuggestion(s)}
                    className="flex w-full items-start gap-3 px-6 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.mainText}</p>
                      {s.secondaryText && (
                        <p className="truncate text-xs text-muted-foreground">{s.secondaryText}</p>
                      )}
                    </div>
                  </button>
                ))}

                {!searching && query.trim().length > 2 && suggestions.length === 0 && (
                  <p className="px-6 py-4 text-sm text-muted-foreground">No results found</p>
                )}
                {query.trim().length === 0 && (
                  <p className="px-6 py-4 text-sm text-muted-foreground">Start typing to search…</p>
                )}
              </div>
            </>
          )}

          {screen === 'confirm' && (
            <>
              <DialogHeader className="flex-row items-start justify-between gap-3 border-b border-border px-6 py-4">
                <div className="min-w-0">
                  <DialogTitle>Confirm Place</DialogTitle>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{suggestionLabel}</p>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setScreen('search')
                    setQuery('')
                    setSuggestions([])
                  }}
                  size={'sm'}
                  variant={'ghost'}
                >
                  <PencilIcon className="size-4" weight="bold" />
                </Button>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void form.handleSubmit(onConfirm)(e)
                }}
                className="flex flex-col gap-5 p-6"
              >
                <Field
                  data-invalid={!!form.formState.errors.address}
                  className="flex flex-col gap-1.5"
                >
                  <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Full Address
                  </FieldLabel>
                  <FieldContent>
                    <InputGroup className="w-full">
                      <InputGroupAddon align="inline-start">
                        <MapPinIcon className="size-4" weight="bold" />
                      </InputGroupAddon>
                      <InputGroupInput
                        placeholder="Full address"
                        aria-invalid={!!form.formState.errors.address}
                        {...form.register('address')}
                      />
                    </InputGroup>
                    <FieldError
                      errors={
                        form.formState.errors.address?.message
                          ? [{ message: form.formState.errors.address.message }]
                          : undefined
                      }
                    />
                  </FieldContent>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field
                    data-invalid={!!form.formState.errors.latitude}
                    className="flex flex-col gap-1.5"
                  >
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Latitude
                    </FieldLabel>
                    <FieldContent>
                      <InputGroup className="w-full">
                        <InputGroupInput
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g. 28.6139"
                          aria-invalid={!!form.formState.errors.latitude}
                          {...form.register('latitude')}
                        />
                      </InputGroup>
                      <FieldError
                        errors={
                          form.formState.errors.latitude?.message
                            ? [{ message: form.formState.errors.latitude.message }]
                            : undefined
                        }
                      />
                    </FieldContent>
                  </Field>

                  <Field
                    data-invalid={!!form.formState.errors.longitude}
                    className="flex flex-col gap-1.5"
                  >
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Longitude
                    </FieldLabel>
                    <FieldContent>
                      <InputGroup className="w-full">
                        <InputGroupInput
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g. 77.2090"
                          aria-invalid={!!form.formState.errors.longitude}
                          {...form.register('longitude')}
                        />
                      </InputGroup>
                      <FieldError
                        errors={
                          form.formState.errors.longitude?.message
                            ? [{ message: form.formState.errors.longitude.message }]
                            : undefined
                        }
                      />
                    </FieldContent>
                  </Field>
                </div>

                <div className="flex items-center justify-between">
                  <Button type="button" variant="outline" onClick={dismissDialog}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <CheckIcon className="size-3.5" weight="bold" />
                    Confirm Place
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
