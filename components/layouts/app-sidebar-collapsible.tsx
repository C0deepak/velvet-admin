'use client'

import { CaretRightIcon, type Icon } from '@phosphor-icons/react'
import { usePathname } from 'next/navigation'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import Link from 'next/link'

interface CollapsibleNavItem {
  title: string
  url: string
  icon?: Icon
  items?: { title: string; url: string; icon?: Icon }[]
}

export function AppSidebarCollapsible({
  items,
  label,
}: {
  items: CollapsibleNavItem[]
  label?: string
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const isChildActive = item.items?.some(
            (sub) => pathname === sub.url || pathname.startsWith(sub.url + '/')
          )
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isChildActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} isActive={isChildActive}>
                    {item.icon && (
                      <item.icon weight={isChildActive ? 'fill' : 'regular'} size={18} />
                    )}
                    <span>{item.title}</span>
                    <CaretRightIcon
                      className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                      weight="bold"
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const isSubActive =
                        pathname === subItem.url || pathname.startsWith(subItem.url + '/')
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isSubActive}>
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
