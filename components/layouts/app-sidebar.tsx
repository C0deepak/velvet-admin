'use client'

import * as React from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { AppSidebarDirectLinks } from './app-sidebar-direct-links'
import { AppSidebarUser } from './app-sidebar-user'
import { AppSidebarHeader } from './app-sidebar-header'
import {
  CalendarCheckIcon,
  CarIcon,
  CarProfileIcon,
  GarageIcon,
  UserSoundIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { AppSidebarCollapsible } from './app-sidebar-collapsible'
import { useAuth } from '@/app/auth/context/auth-provider'

const navMain = [
  { title: 'Chauffeurs', url: '/chauffeurs', icon: UserSoundIcon },
  { title: 'Bookings', url: '/bookings', icon: CalendarCheckIcon },
  { title: 'Customers', url: '/customers', icon: UsersThreeIcon },
]

const navFleet = [
  {
    title: 'Fleet',
    url: '#',
    icon: CarProfileIcon,
    items: [
      { title: 'Categories', url: '/fleet/categories', icon: GarageIcon },
      { title: 'Vehicles', url: '/fleet/vehicles', icon: CarIcon },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth()

  if (!user) return null

  const userDisplay = {
    name: `${user.firstname} ${user.lastname}`.trim() || user.email,
    email: user.email,
    avatar: '',
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppSidebarHeader />
      </SidebarHeader>
      <SidebarContent>
        <AppSidebarDirectLinks items={navMain} label="Main" />
        <AppSidebarCollapsible items={navFleet} label="Fleet" />
      </SidebarContent>
      <SidebarFooter>
        <AppSidebarUser user={userDisplay} onLogout={logout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
