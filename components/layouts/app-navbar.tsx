'use client'

import { useTheme } from 'next-themes'
import { BellIcon, MoonIcon, SunIcon } from '@phosphor-icons/react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

export default function AppNavbar() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-sidebar/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
        <span className="hidden text-sm font-medium text-muted-foreground sm:block">
          Admin Panel
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          <SunIcon className="hidden size-4 dark:block" weight="bold" />
          <MoonIcon className="size-4 dark:hidden" weight="bold" />
        </Button>
        <Button variant="ghost" size="icon">
          <BellIcon className="size-4" weight="bold" />
        </Button>
      </div>
    </header>
  )
}
