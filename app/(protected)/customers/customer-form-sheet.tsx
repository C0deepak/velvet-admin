'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { customerCreateBodySchema } from './schema'
import type { Customer, CustomerCreateBody } from './types'
import { createCustomer, getCustomerById, updateCustomer } from './api'
import { getApiErrorMessage } from '@/helper/api-error-message'

function fieldErr(
  form: ReturnType<typeof useForm<CustomerCreateBody>>,
  name: keyof CustomerCreateBody
) {
  const m = form.formState.errors[name]?.message
  return m ? [{ message: String(m) }] : undefined
}

const defaultValues: CustomerCreateBody = {
  countryCode: '91',
  phone: '',
  name: '',
  email: '',
  gender: '',
}

type CustomerFormSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` = create new customer */
  customerId: number | null
  onSaved?: (customer: Customer) => void
}

export function CustomerFormSheet({
  open,
  onOpenChange,
  customerId,
  onSaved,
}: CustomerFormSheetProps) {
  const form = useForm<CustomerCreateBody>({
    resolver: zodResolver(customerCreateBodySchema),
    defaultValues,
  })

  const isEdit = customerId != null

  useEffect(() => {
    if (!open) return

    let cancelled = false

    if (customerId == null) {
      queueMicrotask(() => {
        if (cancelled) return
        form.reset(defaultValues)
        form.clearErrors()
      })
      return () => {
        cancelled = true
      }
    }

    void getCustomerById(customerId)
      .then(({ data }) => {
        if (cancelled) return
        const national = data.phone.startsWith(data.countryCode)
          ? data.phone.slice(data.countryCode.length)
          : data.phone
        queueMicrotask(() => {
          if (cancelled) return
          form.reset({
            countryCode: data.countryCode,
            phone: national,
            name: data.name ?? '',
            email: data.email ?? '',
            gender: data.gender ?? '',
          })
          form.clearErrors()
        })
      })
      .catch((err) => {
        if (!cancelled)
          queueMicrotask(() => {
            form.setError('root', { message: getApiErrorMessage(err) })
          })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when sheet target changes
  }, [open, customerId])

  async function onSubmit(values: CustomerCreateBody) {
    form.clearErrors('root')
    try {
      if (customerId == null) {
        const { data } = await createCustomer({
          ...values,
          email: values.email?.trim() || undefined,
          gender: values.gender?.trim() || undefined,
        })
        onSaved?.(data)
        onOpenChange(false)
        return
      }
      const { data } = await updateCustomer(customerId, {
        ...values,
        email: values.email?.trim() || undefined,
        gender: values.gender?.trim() || undefined,
      })
      onSaved?.(data)
      onOpenChange(false)
    } catch (err) {
      form.setError('root', { message: getApiErrorMessage(err) })
    }
  }

  const rootErr = form.formState.errors.root?.message
  const submitting = form.formState.isSubmitting

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-6">
          <SheetTitle>{isEdit ? 'Edit customer' : 'New customer'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 px-6 py-6">
          <div className="grid grid-cols-4 gap-3">
            <Field className="col-span-1 flex flex-col gap-1.5">
              <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Code
              </FieldLabel>
              <FieldContent>
                <InputGroup>
                  <InputGroupInput {...form.register('countryCode')} />
                </InputGroup>
                <FieldError errors={fieldErr(form, 'countryCode')} />
              </FieldContent>
            </Field>
            <Field className="col-span-3 flex flex-col gap-1.5">
              <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Phone <span className="font-normal">(national)</span>
              </FieldLabel>
              <FieldContent>
                <InputGroup>
                  <InputGroupInput {...form.register('phone')} placeholder="6299388225" />
                </InputGroup>
                <FieldError errors={fieldErr(form, 'phone')} />
              </FieldContent>
            </Field>
          </div>
          <Field className="flex flex-col gap-1.5">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Name
            </FieldLabel>
            <FieldContent>
              <InputGroup className="w-full">
                <InputGroupInput {...form.register('name')} />
              </InputGroup>
              <FieldError errors={fieldErr(form, 'name')} />
            </FieldContent>
          </Field>
          <Field className="flex flex-col gap-1.5">
            <FieldLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Email <span className="font-normal normal-case">(optional)</span>
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
              Gender <span className="font-normal normal-case">(optional)</span>
            </FieldLabel>
            <FieldContent>
              <Controller
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <Select
                    value={field.value?.trim() ? field.value : '__none__'}
                    onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={fieldErr(form, 'gender')} />
            </FieldContent>
          </Field>
          {rootErr && <p className="text-sm text-destructive">{rootErr}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
