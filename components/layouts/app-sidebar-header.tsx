'use client'

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { CarProfileIcon } from '@phosphor-icons/react'

export function AppSidebarHeader() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="pointer-events-none select-none">
          <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-primary shadow-sm">
            <CarProfileIcon className="size-4 text-primary-foreground" weight="fill" />
          </div>
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate text-sm font-semibold">Velvet Experience</span>
            <span className="truncate text-xs text-muted-foreground">velvetexperience.com</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
