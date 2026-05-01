'use client'

import { useEffect, useState } from 'react'
import {
  useForm,
  Controller,
  FormProvider,
  useFormContext,
  useWatch,
  type FieldError as RHFFieldError,
  type Path,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { FlowStepBar } from '../bookings/booking-badges'
import { AccountType, ChauffeurGender, chauffeurFormSchema, MaritalStatus } from './schema'
import type { TChauffeurFormValues } from './schema'
import type { TChauffeur } from './types'
import { createChauffeur, getChauffeurById, updateChauffeur, uploadChauffeurFile } from './api'
import { getApiErrorMessage } from '@/helper/api-error-message'
import { cn } from '@/lib/utils'

const STEPS = ['Profile', 'Addresses', 'Documents', 'Bank', 'Work']

const ADDR_KEYS = ['houseNo', 'street', 'city', 'state', 'pincode', 'country'] as const

function addressPaths(prefix: 'address.currentAddress' | 'address.permanentAddress') {
  return ADDR_KEYS.map((k) => `${prefix}.${k}` as Path<TChauffeurFormValues>)
}

const STEP_0: Path<TChauffeurFormValues>[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'countryCode',
  'dateOfBirth',
  'dlExpiryDate',
  'gender',
  'licenseNumber',
  'maritalStatus',
  'hasCriminalRecord',
]

const BANK_PATHS = (
  ['accountHolderName', 'accountNumber', 'ifscCode', 'bankName', 'accountType'] as const
).map((k) => `bankDetails.${k}` as Path<TChauffeurFormValues>)

const META_PATHS = (
  [
    'workingHoursStart',
    'workingHoursEnd',
    'drivingStartYear',
    'luxuryDrivingStartYear',
    'luxuryBrandsDriven',
    'joiningDate',
  ] as const
).map((k) => `metadata.${k}` as Path<TChauffeurFormValues>)

const DOC_REQUIRED: Path<TChauffeurFormValues>[] = [
  'documents.aadharCardNo',
  'documents.aadharCardFront',
  'documents.aadharCardBack',
]

function emptyAddress() {
  return {
    houseNo: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  }
}

export function defaultChauffeurFormValues(): TChauffeurFormValues {
  const y = new Date().getFullYear()
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '91',
    dateOfBirth: '',
    dlExpiryDate: '',
    gender: ChauffeurGender.MALE,
    licenseNumber: '',
    maritalStatus: MaritalStatus.SINGLE,
    hasCriminalRecord: false,
    address: {
      currentAddress: emptyAddress(),
      permanentAddress: emptyAddress(),
    },
    documents: {
      aadharCardNo: '',
      aadharCardFront: '',
      aadharCardBack: '',
      panCardNo: null,
      panCard: null,
      license: null,
      policeVerification: null,
      medicalCertificate: null,
      chauffeurPhoto: null,
      bgvCheck: null,
    },
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      accountType: AccountType.SAVINGS,
    },
    metadata: {
      workingHoursStart: '09:00',
      workingHoursEnd: '18:00',
      drivingStartYear: y - 5,
      luxuryDrivingStartYear: y - 2,
      luxuryBrandsDriven: '',
      joiningDate: new Date().toISOString().slice(0, 10),
    },
  }
}

function chauffeurToForm(c: TChauffeur): TChauffeurFormValues {
  const { id, blocked, rating, ...rest } = c
  void id
  void blocked
  void rating
  return rest
}

function normalizeChauffeurPayload(
  v: TChauffeurFormValues,
  samePermanentAsCurrent: boolean
): TChauffeurFormValues {
  const current = v.address.currentAddress
  const permanent = samePermanentAsCurrent ? current : v.address.permanentAddress
  return {
    ...v,
    address: { currentAddress: current, permanentAddress: permanent },
    documents: {
      ...v.documents,
      panCardNo: v.documents.panCardNo?.trim() || null,
      panCard: v.documents.panCard?.trim() || null,
      license: v.documents.license?.trim() || null,
      policeVerification: v.documents.policeVerification?.trim() || null,
      medicalCertificate: v.documents.medicalCertificate?.trim() || null,
      chauffeurPhoto: v.documents.chauffeurPhoto?.trim() || null,
      bgvCheck: v.documents.bgvCheck?.trim() || null,
    },
    metadata: {
      ...v.metadata,
      drivingStartYear: Number(v.metadata.drivingStartYear),
      luxuryDrivingStartYear: Number(v.metadata.luxuryDrivingStartYear),
    },
  }
}

function fieldErr(
  form: UseFormReturn<TChauffeurFormValues>,
  name: Path<TChauffeurFormValues>
): { message: string }[] | undefined {
  const e = form.getFieldState(name, form.formState).error as RHFFieldError | undefined
  return e?.message ? [{ message: String(e.message) }] : undefined
}

function PresignedFileRow({
  name,
  label,
  required,
}: {
  name: Path<TChauffeurFormValues>
  label: string
  required?: boolean
}) {
  const form = useFormContext<TChauffeurFormValues>()
  const val = useWatch({ control: form.control, name }) as string | null | undefined
  const [busy, setBusy] = useState(false)
  const err = fieldErr(form, name)

  async function onFile(f: File | null) {
    if (!f) return
    setBusy(true)
    try {
      const url = await uploadChauffeurFile(f)
      form.setValue(name, url, { shouldValidate: true, shouldDirty: true })
    } catch (e) {
      form.setError('root', { message: getApiErrorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Field className="flex flex-col gap-1.5">
      <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <FieldContent>
        <InputGroup className="w-full">
          <InputGroupInput
            type="file"
            accept="image/*,application/pdf"
            disabled={busy}
            className="cursor-pointer text-xs file:cursor-pointer file:border-0 file:bg-muted file:px-2 file:py-1"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </InputGroup>
        {busy && <p className="text-[10px] text-muted-foreground">Uploading…</p>}
        {val ? (
          <p className="truncate text-[10px] text-muted-foreground" title={val}>
            Linked: {val.slice(0, 48)}
            {val.length > 48 ? '…' : ''}
          </p>
        ) : (
          required &&
          !val && <p className="text-[10px] text-muted-foreground">Upload via presigned URL</p>
        )}
        <FieldError errors={err} />
      </FieldContent>
    </Field>
  )
}

export type ChauffeurFormWizardProps = {
  mode: 'create' | 'edit'
  chauffeurId?: number
  onSaved?: (c: TChauffeur) => void
}

export function ChauffeurFormWizard({ mode, chauffeurId, onSaved }: ChauffeurFormWizardProps) {
  const form = useForm<TChauffeurFormValues>({
    resolver: zodResolver(chauffeurFormSchema) as Resolver<TChauffeurFormValues>,
    defaultValues: defaultChauffeurFormValues(),
  })

  const dateOfBirth = useWatch({ control: form.control, name: 'dateOfBirth' })
  const dlExpiryDate = useWatch({ control: form.control, name: 'dlExpiryDate' })
  const workingHoursStart = useWatch({ control: form.control, name: 'metadata.workingHoursStart' })
  const workingHoursEnd = useWatch({ control: form.control, name: 'metadata.workingHoursEnd' })
  const joiningDate = useWatch({ control: form.control, name: 'metadata.joiningDate' })

  const [step, setStep] = useState(0)
  const [samePermanent, setSamePermanent] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'edit' || !chauffeurId) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setLoadErr(null)
    })
    void getChauffeurById(chauffeurId)
      .then(({ data }) => {
        if (cancelled) return
        const cur = data.address?.currentAddress
        const perm = data.address?.permanentAddress
        const same = !!cur && !!perm && ADDR_KEYS.every((k) => (cur[k] ?? '') === (perm[k] ?? ''))

        queueMicrotask(() => {
          if (cancelled) return
          form.reset(chauffeurToForm(data))
          setSamePermanent(same)
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
  }, [mode, chauffeurId])

  async function validateCurrentStep(): Promise<boolean> {
    switch (step) {
      case 0:
        return form.trigger(STEP_0)
      case 1:
        return form.trigger(
          samePermanent
            ? addressPaths('address.currentAddress')
            : [
                ...addressPaths('address.currentAddress'),
                ...addressPaths('address.permanentAddress'),
              ]
        )
      case 2:
        return form.trigger(DOC_REQUIRED)
      case 3:
        return form.trigger(BANK_PATHS)
      case 4:
        return form.trigger(META_PATHS)
      default:
        return true
    }
  }

  async function goNext() {
    const ok = await validateCurrentStep()
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goPrev() {
    form.clearErrors('root')
    setStep((s) => Math.max(s - 1, 0))
  }

  async function onSubmit(values: TChauffeurFormValues) {
    form.clearErrors('root')
    const payload = normalizeChauffeurPayload(values, samePermanent)
    try {
      if (mode === 'create') {
        const { data } = await createChauffeur(payload)
        onSaved?.(data)
        return
      }
      if (!chauffeurId) return
      const { data } = await updateChauffeur(chauffeurId, payload)
      onSaved?.(data)
    } catch (e) {
      form.setError('root', { message: getApiErrorMessage(e) })
    }
  }

  const rootErr = form.formState.errors.root?.message

  const stepContent = (
    <>
      {step === 0 && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Field className="flex flex-col gap-1.5 sm:col-span-1">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              First name
            </FieldLabel>
            <FieldContent>
              <InputGroup className="w-full">
                <InputGroupInput {...form.register('firstName')} />
              </InputGroup>
              <FieldError errors={fieldErr(form, 'firstName')} />
            </FieldContent>
          </Field>
          <Field className="flex flex-col gap-1.5 sm:col-span-1">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Last name
            </FieldLabel>
            <FieldContent>
              <InputGroup className="w-full">
                <InputGroupInput {...form.register('lastName')} />
              </InputGroup>
              <FieldError errors={fieldErr(form, 'lastName')} />
            </FieldContent>
          </Field>
          <Field className="flex flex-col gap-1.5 sm:col-span-2">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Email
            </FieldLabel>
            <FieldContent>
              <InputGroup className="w-full">
                <InputGroupInput type="email" {...form.register('email')} />
              </InputGroup>
              <FieldError errors={fieldErr(form, 'email')} />
            </FieldContent>
          </Field>
          <Field className="flex flex-col gap-1.5">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Country code
            </FieldLabel>
            <FieldContent>
              <InputGroup className="w-full">
                <InputGroupInput {...form.register('countryCode')} />
              </InputGroup>
              <FieldError errors={fieldErr(form, 'countryCode')} />
            </FieldContent>
          </Field>
          <Field className="flex flex-col gap-1.5">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Phone (10 digits)
            </FieldLabel>
            <FieldContent>
              <InputGroup className="w-full">
                <InputGroupInput inputMode="numeric" {...form.register('phone')} />
              </InputGroup>
              <FieldError errors={fieldErr(form, 'phone')} />
            </FieldContent>
          </Field>
          <Field className="flex flex-col gap-1.5">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Date of birth
            </FieldLabel>
            <FieldContent>
              <DatePicker
                value={dateOfBirth}
                onChange={(v) => form.setValue('dateOfBirth', v, { shouldValidate: true })}
                error={!!form.formState.errors.dateOfBirth}
              />
              <FieldError errors={fieldErr(form, 'dateOfBirth')} />
            </FieldContent>
          </Field>
          <Field className="flex flex-col gap-1.5">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              License expiry
            </FieldLabel>
            <FieldContent>
              <DatePicker
                value={dlExpiryDate}
                onChange={(v) => form.setValue('dlExpiryDate', v, { shouldValidate: true })}
                error={!!form.formState.errors.dlExpiryDate}
              />
              <FieldError errors={fieldErr(form, 'dlExpiryDate')} />
            </FieldContent>
          </Field>
          <Field className="flex flex-col gap-1.5">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Gender
            </FieldLabel>
            <Controller
              control={form.control}
              name="gender"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {[ChauffeurGender.MALE, ChauffeurGender.FEMALE, ChauffeurGender.OTHER].map(
                      (g) => (
                        <SelectItem key={g} value={g}>
                          {g.replace(/_/g, ' ')}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={fieldErr(form, 'gender')} />
          </Field>
          <Field className="flex flex-col gap-1.5">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Marital status
            </FieldLabel>
            <Controller
              control={form.control}
              name="maritalStatus"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(MaritalStatus).map((ms) => (
                      <SelectItem key={ms} value={ms}>
                        {ms}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={fieldErr(form, 'maritalStatus')} />
          </Field>
          <Field className="flex flex-col gap-1.5 sm:col-span-2">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              License number
            </FieldLabel>
            <FieldContent>
              <InputGroup className="w-full">
                <InputGroupInput {...form.register('licenseNumber')} />
              </InputGroup>
              <FieldError errors={fieldErr(form, 'licenseNumber')} />
            </FieldContent>
          </Field>
          <Controller
            control={form.control}
            name="hasCriminalRecord"
            render={({ field }) => (
              <Field className="flex flex-col gap-2 sm:col-span-2">
                <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Criminal history
                </FieldLabel>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Choose one option. If details are needed, they can be collected outside this form.
                </p>
                <FieldContent>
                  <div
                    className="flex w-full max-w-lg border border-border"
                    role="group"
                    aria-label="Criminal history declaration"
                  >
                    <button
                      type="button"
                      aria-pressed={!field.value}
                      onClick={() => field.onChange(false)}
                      className={cn(
                        'min-h-11 flex-1 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        !field.value
                          ? 'bg-muted/55 text-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted/35 hover:text-foreground'
                      )}
                    >
                      Nothing to disclose
                    </button>
                    <div className="w-px shrink-0 bg-border" aria-hidden />
                    <button
                      type="button"
                      aria-pressed={field.value}
                      onClick={() => field.onChange(true)}
                      className={cn(
                        'min-h-11 flex-1 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        field.value
                          ? 'bg-muted/55 text-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted/35 hover:text-foreground'
                      )}
                    >
                      Reports a record
                    </button>
                  </div>
                  <FieldError errors={fieldErr(form, 'hasCriminalRecord')} />
                </FieldContent>
              </Field>
            )}
          />
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-8">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={samePermanent}
              onChange={(e) => setSamePermanent(e.target.checked)}
            />
            Permanent address same as current
          </label>
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current address
            </legend>
            <div className="grid gap-6 sm:grid-cols-2">
              {ADDR_KEYS.map((k) => (
                <Field key={`cur-${k}`} className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {k}
                  </FieldLabel>
                  <FieldContent>
                    <InputGroup className="w-full">
                      <InputGroupInput {...form.register(`address.currentAddress.${k}` as const)} />
                    </InputGroup>
                    <FieldError errors={fieldErr(form, `address.currentAddress.${k}`)} />
                  </FieldContent>
                </Field>
              ))}
            </div>
          </fieldset>
          {!samePermanent && (
            <fieldset className="flex flex-col gap-4">
              <legend className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Permanent address
              </legend>
              <div className="grid gap-6 sm:grid-cols-2">
                {ADDR_KEYS.map((k) => (
                  <Field key={`perm-${k}`} className="flex flex-col gap-1.5">
                    <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {k}
                    </FieldLabel>
                    <FieldContent>
                      <InputGroup className="w-full">
                        <InputGroupInput
                          {...form.register(`address.permanentAddress.${k}` as const)}
                        />
                      </InputGroup>
                      <FieldError errors={fieldErr(form, `address.permanentAddress.${k}`)} />
                    </FieldContent>
                  </Field>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          <p className="text-xs text-muted-foreground">
            Aadhaar files are required. Other scans are optional; each upload goes through a
            presigned URL then stores the returned file URL.
          </p>
          <Field className="flex flex-col gap-1.5">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Aadhaar number *
            </FieldLabel>
            <FieldContent>
              <InputGroup className="w-full">
                <InputGroupInput {...form.register('documents.aadharCardNo')} />
              </InputGroup>
              <FieldError errors={fieldErr(form, 'documents.aadharCardNo')} />
            </FieldContent>
          </Field>
          <PresignedFileRow name="documents.aadharCardFront" label="Aadhaar front" required />
          <PresignedFileRow name="documents.aadharCardBack" label="Aadhaar back" required />

          <Field className="flex flex-col gap-1.5">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              PAN number{' '}
              <span className="font-normal capitalize tracking-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <FieldContent>
              <Controller
                control={form.control}
                name="documents.panCardNo"
                render={({ field }) => (
                  <InputGroup className="w-full">
                    <InputGroupInput
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </InputGroup>
                )}
              />
            </FieldContent>
          </Field>
          <PresignedFileRow name="documents.panCard" label="PAN scan" />

          <PresignedFileRow name="documents.license" label="License scan (optional)" />
          <PresignedFileRow name="documents.chauffeurPhoto" label="Profile photo (optional)" />
          <PresignedFileRow
            name="documents.policeVerification"
            label="Police verification (optional)"
          />
          <PresignedFileRow
            name="documents.medicalCertificate"
            label="Medical certificate (optional)"
          />
          <PresignedFileRow name="documents.bgvCheck" label="BGV check (optional)" />
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-6 sm:grid-cols-2">
          {(['accountHolderName', 'accountNumber', 'ifscCode', 'bankName'] as const).map((k) => (
            <Field key={k} className="flex flex-col gap-1.5 sm:col-span-2">
              <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {k === 'accountHolderName'
                  ? 'Account holder'
                  : k === 'accountNumber'
                    ? 'Account number'
                    : k === 'ifscCode'
                      ? 'IFSC'
                      : 'Bank name'}
              </FieldLabel>
              <FieldContent>
                <InputGroup className="w-full">
                  <InputGroupInput {...form.register(`bankDetails.${k}`)} />
                </InputGroup>
                <FieldError errors={fieldErr(form, `bankDetails.${k}`)} />
              </FieldContent>
            </Field>
          ))}
          <Field className="flex flex-col gap-1.5 sm:col-span-2">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Account type
            </FieldLabel>
            <Controller
              control={form.control}
              name="bankDetails.accountType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AccountType).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={fieldErr(form, 'bankDetails.accountType')} />
          </Field>
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Field className="flex flex-col gap-1.5">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Workday start
            </FieldLabel>
            <TimePicker
              value={workingHoursStart}
              onChange={(v) =>
                form.setValue('metadata.workingHoursStart', v, { shouldValidate: true })
              }
              error={!!form.formState.errors.metadata?.workingHoursStart}
            />
            <FieldError errors={fieldErr(form, 'metadata.workingHoursStart')} />
          </Field>
          <Field className="flex flex-col gap-1.5">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Workday end
            </FieldLabel>
            <TimePicker
              value={workingHoursEnd}
              onChange={(v) =>
                form.setValue('metadata.workingHoursEnd', v, { shouldValidate: true })
              }
              error={!!form.formState.errors.metadata?.workingHoursEnd}
            />
            <FieldError errors={fieldErr(form, 'metadata.workingHoursEnd')} />
          </Field>
          <Field className="flex flex-col gap-1.5">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Driving since (year)
            </FieldLabel>
            <FieldContent>
              <InputGroup className="w-full">
                <InputGroupInput
                  type="number"
                  min={1950}
                  {...form.register('metadata.drivingStartYear', { valueAsNumber: true })}
                />
              </InputGroup>
              <FieldError errors={fieldErr(form, 'metadata.drivingStartYear')} />
            </FieldContent>
          </Field>
          <Field className="flex flex-col gap-1.5">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Luxury driving since (year)
            </FieldLabel>
            <FieldContent>
              <InputGroup className="w-full">
                <InputGroupInput
                  type="number"
                  min={1950}
                  {...form.register('metadata.luxuryDrivingStartYear', { valueAsNumber: true })}
                />
              </InputGroup>
              <FieldError errors={fieldErr(form, 'metadata.luxuryDrivingStartYear')} />
            </FieldContent>
          </Field>
          <Field className="flex flex-col gap-1.5 sm:col-span-2">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Luxury brands driven
            </FieldLabel>
            <FieldContent>
              <Textarea
                {...form.register('metadata.luxuryBrandsDriven')}
                rows={3}
                className="border-b border-input bg-transparent text-sm outline-none focus-visible:border-b-ring"
                placeholder="e.g. Mercedes S-Class, BMW 7"
              />
              <FieldError errors={fieldErr(form, 'metadata.luxuryBrandsDriven')} />
            </FieldContent>
          </Field>
          <Field className="flex flex-col gap-1.5 sm:col-span-2">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Joining date
            </FieldLabel>
            <DatePicker
              value={joiningDate}
              onChange={(v) => form.setValue('metadata.joiningDate', v, { shouldValidate: true })}
              error={!!form.formState.errors.metadata?.joiningDate}
            />
            <FieldError errors={fieldErr(form, 'metadata.joiningDate')} />
          </Field>
        </div>
      )}
    </>
  )

  const submitting = form.formState.isSubmitting

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
            {stepContent}
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
                    {submitting
                      ? 'Saving…'
                      : mode === 'create'
                        ? 'Create chauffeur'
                        : 'Save changes'}
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
