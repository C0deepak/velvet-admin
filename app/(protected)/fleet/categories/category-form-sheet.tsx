'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller, type FieldPath } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { categoryBasicsTabSchema, categoryHourlyTabSchema } from './schema'
import type {
  CategoryMetadataForm,
  HourlyPackageMetadata,
  TCategory,
  TCategoryCreateBody,
  TCategoryFormValues,
  TCategoryPatch,
  WaitingTimeConfig,
} from './types'
import { createCategory, getCategoryById, updateCategory, uploadCategoryImageFile } from './api'
import { defaultCategoryFormValues, categoryToForm } from './category-defaults'
import { getApiErrorMessage } from '@/helper/api-error-message'

type CategoryFormSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryId: number | null
  onSaved?: (c: TCategory) => void
}

function normalizeImageUrl(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null
  return raw
}

async function syncActiveImage(
  created: TCategory,
  active: number,
  imageUrl: string | null
): Promise<TCategory> {
  if (created.active === active && created.imageUrl === imageUrl) return created
  const { data } = await updateCategory(created.id, { active, imageUrl })
  return data
}

function applyZodErrors(
  form: ReturnType<typeof useForm<TCategoryFormValues>>,
  issues: ReadonlyArray<{ path?: PropertyKey[]; message?: string }>
) {
  form.clearErrors()
  for (const iss of issues) {
    const segs = iss.path ?? []
    const path = segs.map(String).join('.') as FieldPath<TCategoryFormValues>
    if (path) form.setError(path, { message: iss.message ?? 'Invalid value' })
  }
}

export function CategoryFormSheet({
  open,
  onOpenChange,
  categoryId,
  onSaved,
}: CategoryFormSheetProps) {
  const form = useForm<TCategoryFormValues>({
    defaultValues: defaultCategoryFormValues(),
  })

  const [tab, setTab] = useState<'basics' | 'hourly'>('basics')
  const [createdId, setCreatedId] = useState<number | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [imgBusy, setImgBusy] = useState(false)

  const effectiveId = categoryId ?? createdId

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setTab('basics')
        setCreatedId(null)
        setLoadErr(null)
        form.reset(defaultCategoryFormValues())
      })
      return
    }
    if (categoryId == null) {
      queueMicrotask(() => {
        setCreatedId(null)
        form.reset(defaultCategoryFormValues())
        setLoadErr(null)
      })
      return
    }
    let cancelled = false
    setLoadErr(null)
    void getCategoryById(categoryId)
      .then(({ data }) => {
        if (cancelled) return
        queueMicrotask(() => {
          form.reset(categoryToForm(data))
          setCreatedId(null)
        })
      })
      .catch((e) => {
        if (!cancelled) setLoadErr(getApiErrorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [open, categoryId, form])

  async function onPickImage(f: File | null) {
    if (!f) return
    setImgBusy(true)
    try {
      const url = await uploadCategoryImageFile(f)
      form.setValue('imageUrl', url, { shouldDirty: true })
    } catch (e) {
      form.setError('root', { message: getApiErrorMessage(e) })
    } finally {
      setImgBusy(false)
    }
  }

  async function saveBasicsTab() {
    form.clearErrors('root')
    const v = form.getValues()
    const parsed = categoryBasicsTabSchema.safeParse({
      categoryName: v.categoryName,
      basePrice: v.basePrice,
      active: v.active,
      imageUrl: v.imageUrl === '' ? null : v.imageUrl,
      metadata: { waitingTimeConfig: v.metadata.waitingTimeConfig },
    })
    if (!parsed.success) {
      applyZodErrors(form, parsed.error.issues)
      return
    }

    const waitingStrict = coerceWaiting(parsed.data.metadata.waitingTimeConfig)
    const hourlyStrict = tryCoerceHourly(v.metadata.hourlyPackage)
    const imageUrlResolved = normalizeImageUrl(v.imageUrl)

    setSaving(true)
    try {
      if (effectiveId == null) {
        const createBody: TCategoryCreateBody = {
          categoryName: parsed.data.categoryName,
          basePrice: parsed.data.basePrice,
          metadata: {
            waitingTimeConfig: waitingStrict,
            ...(hourlyStrict ? { hourlyPackage: hourlyStrict } : {}),
          },
        }
        const { data: created } = await createCategory(createBody)
        setCreatedId(created.id)
        const synced = await syncActiveImage(created, parsed.data.active, imageUrlResolved)
        form.reset(categoryToForm(synced))
        onSaved?.(synced)
        if (categoryId == null) setTab('hourly')
      } else {
        const patch: TCategoryPatch = {
          categoryName: v.categoryName,
          basePrice: v.basePrice,
          active: v.active,
          imageUrl: imageUrlResolved,
          metadata: hourlyStrict
            ? { waitingTimeConfig: waitingStrict, hourlyPackage: hourlyStrict }
            : { waitingTimeConfig: waitingStrict },
        }
        const { data } = await updateCategory(effectiveId, patch)
        form.reset(categoryToForm(data))
        onSaved?.(data)
      }
    } catch (e) {
      form.setError('root', { message: getApiErrorMessage(e) })
    } finally {
      setSaving(false)
    }
  }

  async function saveHourlyTab() {
    form.clearErrors('root')
    const v = form.getValues()
    const parsedHourly = categoryHourlyTabSchema.safeParse({
      metadata: { hourlyPackage: v.metadata.hourlyPackage },
    })
    if (!parsedHourly.success) {
      applyZodErrors(form, parsedHourly.error.issues)
      return
    }
    const hourlyPackage = coerceHourlyStrict(parsedHourly.data.metadata.hourlyPackage)

    if (effectiveId == null) {
      const basics = categoryBasicsTabSchema.safeParse({
        categoryName: v.categoryName,
        basePrice: v.basePrice,
        active: v.active,
        imageUrl: v.imageUrl === '' ? null : v.imageUrl,
        metadata: { waitingTimeConfig: v.metadata.waitingTimeConfig },
      })
      if (!basics.success) {
        form.setError('root', {
          message: 'Fill the Basics tab (name, price, waiting rules) before saving hourly add-ons.',
        })
        setTab('basics')
        applyZodErrors(form, basics.error.issues)
        return
      }
      const waitingStrict = coerceWaiting(basics.data.metadata.waitingTimeConfig)
      const imageUrlResolved = normalizeImageUrl(v.imageUrl)

      setSaving(true)
      try {
        const { data: created } = await createCategory({
          categoryName: basics.data.categoryName,
          basePrice: basics.data.basePrice,
          metadata: { waitingTimeConfig: waitingStrict, hourlyPackage },
        })
        setCreatedId(created.id)
        const synced = await syncActiveImage(created, v.active, imageUrlResolved)
        form.reset(categoryToForm(synced))
        onSaved?.(synced)
      } catch (e) {
        form.setError('root', { message: getApiErrorMessage(e) })
      } finally {
        setSaving(false)
      }
      return
    }

    setSaving(true)
    try {
      const { data } = await updateCategory(effectiveId, { metadata: { hourlyPackage } })
      form.reset(categoryToForm(data))
      onSaved?.(data)
    } catch (e) {
      form.setError('root', { message: getApiErrorMessage(e) })
    } finally {
      setSaving(false)
    }
  }

  const rootErr = form.formState.errors.root?.message
  const imgUrl = form.watch('imageUrl')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex min-w-[min(100vw-2rem,28rem)] flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="space-y-0 border-0 px-6 pb-0 pt-6">
          <SheetTitle>{effectiveId == null ? 'New category' : 'Edit category'}</SheetTitle>
          <nav
            className="-mx-6 mt-4 flex border-b border-border px-6"
            role="tablist"
            aria-label="Category sections"
          >
            {(
              [
                { id: 'basics' as const, label: 'Basics', hint: 'Name, price, waiting rules' },
                { id: 'hourly' as const, label: 'Hourly package', hint: 'Extra km & time charges' },
              ] as const
            ).map(({ id, label, hint }) => {
              const active = tab === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  id={`category-tab-${id}`}
                  onClick={() => {
                    setTab(id)
                    form.clearErrors()
                  }}
                  className={cn(
                    'group relative flex min-w-0 flex-1 flex-col items-start gap-0.5 border-b-2 pb-3 pl-1 pr-3 pt-1 text-left transition-colors outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2',
                    '-mb-px',
                    active
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                    {label}
                  </span>
                  <span className="hidden text-[11px] leading-snug tracking-normal text-muted-foreground sm:block">
                    {hint}
                  </span>
                </button>
              )
            })}
          </nav>
        </SheetHeader>

        <div
          className="flex flex-col gap-6 px-6 py-6"
          role="tabpanel"
          aria-labelledby={`category-tab-${tab}`}
        >
          {loadErr && <p className="text-sm text-destructive">{loadErr}</p>}
          {tab === 'basics' && (
            <div className="flex flex-col gap-6">
              <Field className="gap-1.5">
                <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </FieldLabel>
                <FieldContent>
                  <InputGroup className="w-full">
                    <InputGroupInput {...form.register('categoryName')} />
                  </InputGroup>
                  <FieldError errors={fieldErrFmt(form, 'categoryName')} />
                </FieldContent>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Base price (₹)
                </FieldLabel>
                <FieldContent>
                  <InputGroup className="w-full">
                    <InputGroupInput
                      type="number"
                      step="0.01"
                      min={0}
                      {...form.register('basePrice', { valueAsNumber: true })}
                    />
                  </InputGroup>
                  <FieldError errors={fieldErrFmt(form, 'basePrice')} />
                </FieldContent>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={field.value === 1}
                          onChange={(e) => field.onChange(e.target.checked ? 1 : 0)}
                        />
                        <span className="text-muted-foreground">
                          Active (visible for new bookings)
                        </span>
                      </label>
                    )}
                  />
                </FieldContent>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Image
                </FieldLabel>
                <FieldContent>
                  <InputGroup className="w-full">
                    <InputGroupInput
                      type="file"
                      accept="image/*"
                      disabled={imgBusy}
                      className="cursor-pointer text-xs file:cursor-pointer"
                      onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
                    />
                  </InputGroup>
                  {imgBusy && <p className="text-[10px] text-muted-foreground">Uploading…</p>}
                  {imgUrl && typeof imgUrl === 'string' && imgUrl.length > 0 && (
                    <p className="mt-1 truncate text-[10px] text-muted-foreground" title={imgUrl}>
                      {imgUrl.length > 72 ? `${imgUrl.slice(0, 72)}…` : imgUrl}
                    </p>
                  )}
                </FieldContent>
              </Field>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Waiting time charges
              </p>
              <div className="grid gap-5 sm:grid-cols-3">
                <NullableNumberField
                  form={form}
                  name="metadata.waitingTimeConfig.freeMinutes"
                  lbl="Free minutes"
                  min={0}
                />
                <NullableNumberField
                  form={form}
                  name="metadata.waitingTimeConfig.chargeableIntervalMinutes"
                  lbl="Billable interval (min)"
                  min={1}
                  step="1"
                />
                <NullableNumberField
                  form={form}
                  name="metadata.waitingTimeConfig.chargePerInterval"
                  lbl="Charge / interval (₹)"
                  min={0}
                  step="0.01"
                />
              </div>
            </div>
          )}

          {tab === 'hourly' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <p className="col-span-full text-[11px] leading-relaxed text-muted-foreground">
                Used when hourly packages extend past included km or time. You can save this tab
                alone; Basics must be valid the first time you create a category.
              </p>
              <HpField
                form={form}
                k="additionalFreeKms"
                lbl="Additional free kms"
                min={0}
                step="1"
              />
              <HpField
                form={form}
                k="additionalChargePerKm"
                lbl="Charge per extra km (₹)"
                min={0}
                step="0.01"
              />
              <HpField
                form={form}
                k="additionalFreeMinutes"
                lbl="Additional free minutes"
                min={0}
                step="1"
              />
              <HpField
                form={form}
                k="additionalChargePerInterval"
                lbl="Charge per billing interval (₹)"
                min={0}
                step="0.01"
              />
              <HpField
                form={form}
                k="additionalChargeableIntervalMinutes"
                lbl="Billable interval (min)"
                min={1}
                step="1"
              />
            </div>
          )}

          {rootErr && <p className="text-sm text-destructive">{rootErr}</p>}

          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {tab === 'basics' ? (
              <Button
                type="button"
                disabled={saving || !!loadErr}
                onClick={() => void saveBasicsTab()}
              >
                {saving ? 'Saving…' : 'Save basics'}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={saving || !!loadErr}
                onClick={() => void saveHourlyTab()}
              >
                {saving ? 'Saving…' : 'Save hourly package'}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function coerceWaiting(w: CategoryMetadataForm['waitingTimeConfig']): WaitingTimeConfig {
  return {
    freeMinutes: w.freeMinutes!,
    chargeableIntervalMinutes: w.chargeableIntervalMinutes!,
    chargePerInterval: w.chargePerInterval!,
  }
}

function tryCoerceHourly(
  h: CategoryMetadataForm['hourlyPackage'] | null | undefined
): HourlyPackageMetadata | null {
  if (
    !h ||
    h.additionalFreeKms == null ||
    h.additionalChargePerKm == null ||
    h.additionalFreeMinutes == null ||
    h.additionalChargePerInterval == null ||
    h.additionalChargeableIntervalMinutes == null
  ) {
    return null
  }
  return {
    additionalFreeKms: h.additionalFreeKms,
    additionalChargePerKm: h.additionalChargePerKm,
    additionalFreeMinutes: h.additionalFreeMinutes,
    additionalChargePerInterval: h.additionalChargePerInterval,
    additionalChargeableIntervalMinutes: h.additionalChargeableIntervalMinutes,
  }
}

function coerceHourlyStrict(h: CategoryMetadataForm['hourlyPackage']): HourlyPackageMetadata {
  return tryCoerceHourly(h)!
}

function fieldErrFmt(
  form: ReturnType<typeof useForm<TCategoryFormValues>>,
  name: FieldPath<TCategoryFormValues>
): { message: string }[] | undefined {
  const e = form.getFieldState(name, form.formState).error
  return e?.message ? [{ message: String(e.message) }] : undefined
}

function NullableNumberField({
  form,
  name,
  lbl,
  min,
  step = '1',
  fieldClassName = 'gap-1.5',
}: {
  form: ReturnType<typeof useForm<TCategoryFormValues>>
  name: FieldPath<TCategoryFormValues>
  lbl: string
  min?: number
  step?: string
  fieldClassName?: string
}) {
  return (
    <Field className={fieldClassName}>
      <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {lbl}
      </FieldLabel>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => {
          const v = field.value as number | null | undefined
          return (
            <InputGroup className="w-full">
              <InputGroupInput
                type="number"
                {...(typeof min === 'number' ? { min } : {})}
                {...(typeof step !== 'undefined' ? { step } : {})}
                value={v == null ? '' : v}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') {
                    field.onChange(null)
                    return
                  }
                  const n = Number(raw)
                  field.onChange(Number.isFinite(n) ? n : null)
                }}
                onBlur={field.onBlur}
              />
            </InputGroup>
          )
        }}
      />
      <FieldError errors={fieldErrFmt(form, name)} />
    </Field>
  )
}

type HpKey =
  | 'additionalFreeKms'
  | 'additionalChargePerKm'
  | 'additionalFreeMinutes'
  | 'additionalChargePerInterval'
  | 'additionalChargeableIntervalMinutes'

function HpField({
  form,
  k,
  lbl,
  min,
  step,
}: {
  form: ReturnType<typeof useForm<TCategoryFormValues>>
  k: HpKey
  lbl: string
  min: number
  step: string
}) {
  const name = `metadata.hourlyPackage.${k}` as FieldPath<TCategoryFormValues>
  return (
    <NullableNumberField
      form={form}
      name={name}
      lbl={lbl}
      min={min}
      step={step}
      fieldClassName="gap-1.5 sm:col-span-1"
    />
  )
}
