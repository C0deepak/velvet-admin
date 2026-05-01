import { Route } from '@/config/route'
import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <Route type="auth">{children}</Route>
}
