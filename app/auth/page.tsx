import { Route } from '@/config/route'
import { LoginForm } from '@/app/auth/components/login-form'

export default function AuthPage() {
  return (
    <Route type="auth">
      <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 bg-muted/30 p-4 sm:p-8">
        <LoginForm className="w-full max-w-sm" />
        <p className="text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} Velvet Experience. All rights reserved.
        </p>
      </div>
    </Route>
  )
}
