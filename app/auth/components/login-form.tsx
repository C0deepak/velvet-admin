'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRightIcon, CarProfileIcon, LockIcon, UserIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/app/auth/context/auth-provider'
import { loginSchema } from '@/app/auth/schema'
import type { TLoginSchema } from '@/app/auth/types'

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const { login, isLoading, error, clearError } = useAuth()

  const form = useForm<TLoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  async function onSubmit(data: TLoginSchema) {
    clearError()
    await login(data)
  }

  return (
    <div className={cn('w-full', className)} {...props}>
      <Card className="gap-0 py-0">
        <div className="flex flex-col items-center gap-4 px-8 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center bg-primary shadow-sm">
            <CarProfileIcon className="size-6 text-primary-foreground" weight="fill" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-heading text-base font-bold tracking-tight">Velvet Experience</h2>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Administration Portal
            </p>
          </div>
        </div>

        <Separator />

        <CardContent className="flex flex-col gap-7 py-8">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <Field
              data-invalid={!!form.formState.errors.username}
              className="flex flex-col gap-1.5"
            >
              <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Username
              </FieldLabel>
              <FieldContent>
                <InputGroup className="w-full">
                  <InputGroupAddon align="inline-start">
                    <UserIcon className="size-4" weight="bold" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    disabled={isLoading}
                    aria-invalid={!!form.formState.errors.username}
                    {...form.register('username')}
                  />
                </InputGroup>
                <FieldError
                  errors={
                    form.formState.errors.username?.message
                      ? [{ message: form.formState.errors.username.message }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>

            <Field
              data-invalid={!!form.formState.errors.password}
              className="flex flex-col gap-1.5"
            >
              <FieldLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Password
              </FieldLabel>
              <FieldContent>
                <InputGroup className="w-full">
                  <InputGroupAddon align="inline-start">
                    <LockIcon className="size-4" weight="bold" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={isLoading}
                    aria-invalid={!!form.formState.errors.password}
                    {...form.register('password')}
                  />
                </InputGroup>
                <FieldError
                  errors={
                    form.formState.errors.password?.message
                      ? [{ message: form.formState.errors.password.message }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>

            {error && (
              <div className="bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>
            )}

            <Button type="submit" className="mt-1 h-11 w-full gap-2" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRightIcon className="size-4" weight="bold" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
