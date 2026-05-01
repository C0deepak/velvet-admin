'use client'

import { useEffect, useState } from 'react'
import {
  useForm,
  Controller,
  FormProvider,
  useWatch,
  type FieldError as RHFFieldError,
  type Path,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { FlowStepBar } from '../bookings/booking-badges'
import {
  FuelType,
  InsuranceCoverageType,
  TenurePolicyType,
  Transmission,
  vehicleFormSchema,
} from './schema'
import type { TVehicle, TVehicleFormValues, TVehicleWritable } from './types'
import { createVehicle, getVehicleById, updateVehicle, uploadVehicleImage } from './api'
import { getCategories } from '../categories/api'
import type { TCategory } from '../categories/types'
import { getApiErrorMessage } from '@/helper/api-error-message'

const STEPS = ['Basics', 'Registration', 'Extras', 'Compliance', 'Operations']

/** Radix Select disallows empty string values */
const SELECT_NONE = '__NONE__'

const STEP_0: Path<TVehicleFormValues>[] = [
  'vehicleNumber',
  'categoryId',
  'brand',
  'model',
  'seatingCapacity',
  'fuelType',
  'transmission',
]

const STEP_1: Path<TVehicleFormValues>[] = [
  'registrationDate',
  'modelYear',
  'chassisNumber',
  'engineNumber',
  'colour',
]

const STEP_2: Path<TVehicleFormValues>[] = ['hasFastTag', 'hasMcdPass']

const STEP_3: Path<TVehicleFormValues>[] = ['metadata.registrationExpiry', 'metadata.pucExpiry']

function defaultInsuranceDefaults() {
  return {
    policyNumber: null as string | null,
    provider: null as string | null,
    expiryDate: null as string | null,
    premiumAmount: null as number | null,
    coverageType: null as (typeof InsuranceCoverageType)[keyof typeof InsuranceCoverageType] | null,
  }
}

function defaultTenure() {
  return {
    type: null as (typeof TenurePolicyType)[keyof typeof TenurePolicyType] | null,
    startDate: null as string | null,
    endDate: null as string | null,
    amount: null as number | null,
  }
}

function defaultServiceDetails() {
  return {
    lastServiceDate: null as string | null,
    nextServiceDate: null as string | null,
    lastServiceKm: null as number | null,
    serviceProvider: null as string | null,
    serviceType: null as string | null,
  }
}

export function defaultVehicleFormValues(): TVehicleFormValues {
  return {
    vehicleNumber: '',
    categoryId: 0,
    brand: '',
    model: '',
    seatingCapacity: 5,
    fuelType: FuelType.PETROL,
    transmission: Transmission.MANUAL,
    registrationDate: '',
    modelYear: new Date().getFullYear(),
    chassisNumber: '',
    engineNumber: '',
    colour: '',
    hasFastTag: false,
    hasMcdPass: false,
    imageUrl: null,
    available: true,
    metadata: {
      registrationExpiry: '',
      pucExpiry: '',
      avgKmPerDay: null,
      dailyFuelConsumptionLiters: null,
      insuranceDetails: defaultInsuranceDefaults(),
    },
    operationalData: {
      tenurePolicy: defaultTenure(),
      serviceDetails: defaultServiceDetails(),
    },
  }
}

export function vehicleToForm(v: TVehicle): TVehicleFormValues {
  return {
    vehicleNumber: v.vehicleNumber,
    categoryId: v.categoryId,
    brand: v.brand,
    model: v.model,
    seatingCapacity: v.seatingCapacity,
    fuelType: v.fuelType,
    transmission: v.transmission,
    registrationDate: v.registrationDate,
    modelYear: v.modelYear,
    chassisNumber: v.chassisNumber,
    engineNumber: v.engineNumber,
    colour: v.colour,
    hasFastTag: v.hasFastTag,
    hasMcdPass: v.hasMcdPass,
    imageUrl: v.imageUrl ?? null,
    available: v.available,
    metadata: {
      ...v.metadata,
      insuranceDetails:
        v.metadata.insuranceDetails == null
          ? defaultInsuranceDefaults()
          : v.metadata.insuranceDetails,
    },
    operationalData: {
      tenurePolicy:
        v.operationalData.tenurePolicy == null ? defaultTenure() : v.operationalData.tenurePolicy,
      serviceDetails:
        v.operationalData.serviceDetails == null
          ? defaultServiceDetails()
          : v.operationalData.serviceDetails,
    },
  }
}

export function writableFromForm(values: TVehicleFormValues): TVehicleWritable {
  const { available, ...w } = values
  void available
  return w
}

function fieldErr(
  form: UseFormReturn<TVehicleFormValues>,
  name: Path<TVehicleFormValues>
): { message: string }[] | undefined {
  const e = form.getFieldState(name, form.formState).error as RHFFieldError | undefined
  return e?.message ? [{ message: String(e.message) }] : undefined
}

function NumOrNullCtl({
  form,
  name,
  lbl,
  min,
  step,
}: {
  form: UseFormReturn<TVehicleFormValues>
  name: Path<TVehicleFormValues>
  lbl: string
  min?: number
  step?: string
}) {
  return (
    <Field className="flex flex-col gap-1.5">
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
      <FieldError errors={fieldErr(form, name)} />
    </Field>
  )
}

export type VehicleFormWizardProps = {
  mode: 'create' | 'edit'
  vehicleId?: number
  onSaved?: (v: TVehicle) => void
}

export function VehicleFormWizard({ mode, vehicleId, onSaved }: VehicleFormWizardProps) {
  const form = useForm<TVehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema) as Resolver<TVehicleFormValues>,
    defaultValues: defaultVehicleFormValues(),
  })

  const regDate = useWatch({ control: form.control, name: 'registrationDate' })
  const registrationExpiry = useWatch({
    control: form.control,
    name: 'metadata.registrationExpiry',
  })
  const pucExpiry = useWatch({ control: form.control, name: 'metadata.pucExpiry' })
  const tenureStart = useWatch({
    control: form.control,
    name: 'operationalData.tenurePolicy.startDate',
  })
  const tenureEnd = useWatch({
    control: form.control,
    name: 'operationalData.tenurePolicy.endDate',
  })
  const insExpiry = useWatch({
    control: form.control,
    name: 'metadata.insuranceDetails.expiryDate',
  })
  const lastSrv = useWatch({
    control: form.control,
    name: 'operationalData.serviceDetails.lastServiceDate',
  })
  const nextSrv = useWatch({
    control: form.control,
    name: 'operationalData.serviceDetails.nextServiceDate',
  })
  const imageUrlWatch = useWatch({ control: form.control, name: 'imageUrl' })

  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState<TCategory[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [imgBusy, setImgBusy] = useState(false)

  useEffect(() => {
    void getCategories()
      .then((r) => setCategories(r.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (mode !== 'edit' || vehicleId == null) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setLoadErr(null)
    })
    void getVehicleById(vehicleId)
      .then(({ data }) => {
        if (cancelled) return
        queueMicrotask(() => {
          if (cancelled) return
          form.reset(vehicleToForm(data))
          form.clearErrors()
          setStep(0)
        })
      })
      .catch((e) => {
        if (!cancelled) setLoadErr(getApiErrorMessage(e))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, vehicleId])

  async function validateStep(): Promise<boolean> {
    switch (step) {
      case 0:
        return form.trigger(STEP_0)
      case 1:
        return form.trigger(STEP_1)
      case 2:
        return form.trigger(STEP_2)
      case 3:
        return form.trigger(STEP_3)
      case 4:
        return true
      default:
        return true
    }
  }

  async function goNext() {
    const ok = await validateStep()
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goPrev() {
    form.clearErrors('root')
    setStep((s) => Math.max(s - 1, 0))
  }

  async function onSubmit(vals: TVehicleFormValues) {
    form.clearErrors('root')
    const core = writableFromForm(vals)
    try {
      if (mode === 'create') {
        const { data } = await createVehicle(core)
        onSaved?.(data)
        return
      }
      if (vehicleId == null) return
      const { data } = await updateVehicle(vehicleId, { ...core, available: vals.available })
      onSaved?.(data)
    } catch (e) {
      form.setError('root', { message: getApiErrorMessage(e) })
    }
  }

  const rootErr = form.formState.errors.root?.message
  const submitting = form.formState.isSubmitting

  async function onPickImage(f: File | null) {
    if (!f) return
    setImgBusy(true)
    try {
      const url = await uploadVehicleImage(f)
      form.setValue('imageUrl', url, { shouldDirty: true, shouldValidate: true })
    } catch (e) {
      form.setError('root', { message: getApiErrorMessage(e) })
    } finally {
      setImgBusy(false)
    }
  }

  return (
    <FormProvider {...form}>
      {loadErr && (
        <p className="mb-4 rounded-none border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadErr}
        </p>
      )}
      <Card>
        <CardContent className="flex flex-col gap-8 pt-6">
          <div className="border-b border-border pb-6">
            <FlowStepBar step={step + 1} labels={STEPS} />
          </div>
          <form
            className="flex flex-col gap-8"
            onSubmit={(e) => {
              if (step < STEPS.length - 1) {
                e.preventDefault()
                void goNext()
                return
              }
              void form.handleSubmit(onSubmit)(e)
            }}
          >
            {step === 0 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <Field className="flex flex-col gap-1.5 sm:col-span-2">
                  <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Vehicle number
                  </FieldLabel>
                  <InputGroup className="w-full">
                    <InputGroupInput {...form.register('vehicleNumber')} />
                  </InputGroup>
                  <FieldError errors={fieldErr(form, 'vehicleNumber')} />
                </Field>
                <Field className="flex flex-col gap-1.5 sm:col-span-2">
                  <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </FieldLabel>
                  <Controller
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <Select
                        value={field.value === 0 ? '' : (field.value?.toString() ?? '')}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category…" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.categoryName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={fieldErr(form, 'categoryId')} />
                </Field>
                <Field className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Brand
                  </FieldLabel>
                  <InputGroup className="w-full">
                    <InputGroupInput {...form.register('brand')} />
                  </InputGroup>
                  <FieldError errors={fieldErr(form, 'brand')} />
                </Field>
                <Field className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Model
                  </FieldLabel>
                  <InputGroup className="w-full">
                    <InputGroupInput {...form.register('model')} />
                  </InputGroup>
                  <FieldError errors={fieldErr(form, 'model')} />
                </Field>
                <Field className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Seating capacity
                  </FieldLabel>
                  <InputGroup className="w-full">
                    <InputGroupInput
                      type="number"
                      min={1}
                      {...form.register('seatingCapacity', { valueAsNumber: true })}
                    />
                  </InputGroup>
                  <FieldError errors={fieldErr(form, 'seatingCapacity')} />
                </Field>
                <Field className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Fuel
                  </FieldLabel>
                  <Controller
                    control={form.control}
                    name="fuelType"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(FuelType).map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={fieldErr(form, 'fuelType')} />
                </Field>
                <Field className="flex flex-col gap-1.5 sm:col-span-2">
                  <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Transmission
                  </FieldLabel>
                  <Controller
                    control={form.control}
                    name="transmission"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(Transmission).map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={fieldErr(form, 'transmission')} />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <Field className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Registration date
                  </FieldLabel>
                  <DatePicker
                    value={regDate}
                    onChange={(v) => form.setValue('registrationDate', v, { shouldValidate: true })}
                    error={!!form.formState.errors.registrationDate}
                  />
                  <FieldError errors={fieldErr(form, 'registrationDate')} />
                </Field>
                <Field className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Model year
                  </FieldLabel>
                  <InputGroup className="w-full">
                    <InputGroupInput
                      type="number"
                      min={1900}
                      {...form.register('modelYear', { valueAsNumber: true })}
                    />
                  </InputGroup>
                  <FieldError errors={fieldErr(form, 'modelYear')} />
                </Field>
                <Field className="flex flex-col gap-1.5 sm:col-span-2">
                  <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Chassis number
                  </FieldLabel>
                  <InputGroup className="w-full">
                    <InputGroupInput {...form.register('chassisNumber')} />
                  </InputGroup>
                  <FieldError errors={fieldErr(form, 'chassisNumber')} />
                </Field>
                <Field className="flex flex-col gap-1.5 sm:col-span-2">
                  <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Engine number
                  </FieldLabel>
                  <InputGroup className="w-full">
                    <InputGroupInput {...form.register('engineNumber')} />
                  </InputGroup>
                  <FieldError errors={fieldErr(form, 'engineNumber')} />
                </Field>
                <Field className="flex flex-col gap-1.5 sm:col-span-2">
                  <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Colour
                  </FieldLabel>
                  <InputGroup className="w-full">
                    <InputGroupInput {...form.register('colour')} />
                  </InputGroup>
                  <FieldError errors={fieldErr(form, 'colour')} />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap gap-6">
                  <Controller
                    control={form.control}
                    name="hasFastTag"
                    render={({ field }) => (
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        <span className="text-muted-foreground">Has FastTag</span>
                      </label>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="hasMcdPass"
                    render={({ field }) => (
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        <span className="text-muted-foreground">Has MCD pass</span>
                      </label>
                    )}
                  />
                </div>
                {mode === 'edit' && (
                  <Controller
                    control={form.control}
                    name="available"
                    render={({ field }) => (
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        <span className="text-muted-foreground">
                          Vehicle available for dispatch
                        </span>
                      </label>
                    )}
                  />
                )}
                <Field className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Vehicle photo (optional)
                  </FieldLabel>
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
                  {imageUrlWatch &&
                    typeof imageUrlWatch === 'string' &&
                    imageUrlWatch.length > 0 && (
                      <p
                        className="truncate text-[10px] text-muted-foreground"
                        title={imageUrlWatch}
                      >
                        Linked: {imageUrlWatch.slice(0, 56)}
                        {imageUrlWatch.length > 56 ? '…' : ''}
                      </p>
                    )}
                  <FieldError errors={fieldErr(form, 'imageUrl')} />
                </Field>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-8">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Registration expiry
                    </FieldLabel>
                    <DatePicker
                      value={registrationExpiry}
                      onChange={(v) =>
                        form.setValue('metadata.registrationExpiry', v, { shouldValidate: true })
                      }
                      error={!!form.formState.errors.metadata?.registrationExpiry}
                    />
                    <FieldError errors={fieldErr(form, 'metadata.registrationExpiry')} />
                  </Field>
                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      PUC expiry
                    </FieldLabel>
                    <DatePicker
                      value={pucExpiry}
                      onChange={(v) =>
                        form.setValue('metadata.pucExpiry', v, { shouldValidate: true })
                      }
                      error={!!form.formState.errors.metadata?.pucExpiry}
                    />
                    <FieldError errors={fieldErr(form, 'metadata.pucExpiry')} />
                  </Field>
                  <NumOrNullCtl
                    form={form}
                    name="metadata.avgKmPerDay"
                    lbl="Avg km / day (optional)"
                  />
                  <NumOrNullCtl
                    form={form}
                    name="metadata.dailyFuelConsumptionLiters"
                    lbl="Daily fuel consumption (L, optional)"
                    min={0}
                    step="0.01"
                  />
                </div>
                <div>
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Insurance (optional)
                  </p>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field className="flex flex-col gap-1.5 sm:col-span-2">
                      <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Policy number
                      </FieldLabel>
                      <InputGroup className="w-full">
                        <InputGroupInput
                          {...form.register('metadata.insuranceDetails.policyNumber', {
                            setValueAs: (v) =>
                              typeof v !== 'string' || v.trim() === '' ? null : v.trim(),
                          })}
                        />
                      </InputGroup>
                    </Field>
                    <Field className="flex flex-col gap-1.5">
                      <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Provider
                      </FieldLabel>
                      <InputGroup className="w-full">
                        <InputGroupInput
                          {...form.register('metadata.insuranceDetails.provider', {
                            setValueAs: (v) =>
                              typeof v !== 'string' || v.trim() === '' ? null : v.trim(),
                          })}
                        />
                      </InputGroup>
                    </Field>
                    <Field className="flex flex-col gap-1.5">
                      <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Expiry date
                      </FieldLabel>
                      <DatePicker
                        value={insExpiry === null ? '' : (insExpiry ?? '')}
                        onChange={(v) =>
                          form.setValue(
                            'metadata.insuranceDetails.expiryDate',
                            v === '' ? null : v,
                            { shouldValidate: true }
                          )
                        }
                        error={!!form.formState.errors.metadata?.insuranceDetails?.expiryDate}
                      />
                    </Field>
                    <NumOrNullCtl
                      form={form}
                      name="metadata.insuranceDetails.premiumAmount"
                      lbl="Premium (₹)"
                      min={0}
                      step="0.01"
                    />
                    <Field className="flex flex-col gap-1.5">
                      <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Coverage type
                      </FieldLabel>
                      <Controller
                        control={form.control}
                        name="metadata.insuranceDetails.coverageType"
                        render={({ field }) => (
                          <Select
                            value={field.value ?? SELECT_NONE}
                            onValueChange={(raw) =>
                              field.onChange(
                                raw === SELECT_NONE ? null : (raw as InsuranceCoverageType)
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Optional" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={SELECT_NONE}>—</SelectItem>
                              {Object.values(InsuranceCoverageType).map((x) => (
                                <SelectItem key={x} value={x}>
                                  {x}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col gap-10">
                <div>
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tenure / contract (optional)
                  </p>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field className="flex flex-col gap-1.5">
                      <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Type
                      </FieldLabel>
                      <Controller
                        control={form.control}
                        name="operationalData.tenurePolicy.type"
                        render={({ field }) => (
                          <Select
                            value={field.value ?? SELECT_NONE}
                            onValueChange={(raw) =>
                              field.onChange(raw === SELECT_NONE ? null : (raw as TenurePolicyType))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Optional" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={SELECT_NONE}>—</SelectItem>
                              {Object.values(TenurePolicyType).map((x) => (
                                <SelectItem key={x} value={x}>
                                  {x}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>
                    <NumOrNullCtl
                      form={form}
                      name="operationalData.tenurePolicy.amount"
                      lbl="Amount (₹)"
                      min={0}
                      step="0.01"
                    />
                    <Field className="flex flex-col gap-1.5">
                      <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Start date
                      </FieldLabel>
                      <DatePicker
                        value={tenureStart === null ? '' : (tenureStart ?? '')}
                        onChange={(v) =>
                          form.setValue(
                            'operationalData.tenurePolicy.startDate',
                            v === '' ? null : v,
                            { shouldValidate: true }
                          )
                        }
                      />
                    </Field>
                    <Field className="flex flex-col gap-1.5">
                      <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        End date
                      </FieldLabel>
                      <DatePicker
                        value={tenureEnd === null ? '' : (tenureEnd ?? '')}
                        onChange={(v) =>
                          form.setValue(
                            'operationalData.tenurePolicy.endDate',
                            v === '' ? null : v,
                            {
                              shouldValidate: true,
                            }
                          )
                        }
                      />
                    </Field>
                  </div>
                </div>
                <div>
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Service (optional)
                  </p>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field className="flex flex-col gap-1.5">
                      <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Last service date
                      </FieldLabel>
                      <DatePicker
                        value={lastSrv === null ? '' : (lastSrv ?? '')}
                        onChange={(v) =>
                          form.setValue(
                            'operationalData.serviceDetails.lastServiceDate',
                            v === '' ? null : v,
                            { shouldValidate: true }
                          )
                        }
                      />
                    </Field>
                    <Field className="flex flex-col gap-1.5">
                      <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Next service date
                      </FieldLabel>
                      <DatePicker
                        value={nextSrv === null ? '' : (nextSrv ?? '')}
                        onChange={(v) =>
                          form.setValue(
                            'operationalData.serviceDetails.nextServiceDate',
                            v === '' ? null : v,
                            { shouldValidate: true }
                          )
                        }
                      />
                    </Field>
                    <NumOrNullCtl
                      form={form}
                      name="operationalData.serviceDetails.lastServiceKm"
                      lbl="Last service km"
                      min={0}
                      step="1"
                    />
                    <Field className="flex flex-col gap-1.5">
                      <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Provider
                      </FieldLabel>
                      <InputGroup className="w-full">
                        <InputGroupInput
                          {...form.register('operationalData.serviceDetails.serviceProvider', {
                            setValueAs: (v) =>
                              typeof v !== 'string' || v.trim() === '' ? null : v.trim(),
                          })}
                        />
                      </InputGroup>
                    </Field>
                    <Field className="flex flex-col gap-1.5 sm:col-span-2">
                      <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Service type
                      </FieldLabel>
                      <InputGroup className="w-full">
                        <InputGroupInput
                          {...form.register('operationalData.serviceDetails.serviceType', {
                            setValueAs: (v) =>
                              typeof v !== 'string' || v.trim() === '' ? null : v.trim(),
                          })}
                        />
                      </InputGroup>
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {rootErr && <p className="text-sm text-destructive">{rootErr}</p>}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
              <Button type="button" variant="outline" disabled={step === 0} onClick={goPrev}>
                Back
              </Button>
              <div className="flex gap-3">
                {step < STEPS.length - 1 ? (
                  <Button type="submit" variant="secondary">
                    Next step
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting || !!loadErr}>
                    {submitting ? 'Saving…' : mode === 'create' ? 'Create vehicle' : 'Save changes'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </FormProvider>
  )
}
