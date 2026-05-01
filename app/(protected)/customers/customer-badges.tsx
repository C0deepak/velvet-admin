'use client'

import { Badge } from '@/components/ui/badge'
import { CustomerType } from '../bookings/schema'

export const CUSTOMER_ACCOUNT_BADGE_ACTIVE =
  'px-2 py-1 border bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 font-medium normal-case tracking-normal text-xs'

export const CUSTOMER_ACCOUNT_BADGE_INACTIVE =
  'px-2 py-1 border bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 font-medium normal-case tracking-normal text-xs'

export function CustomerAccountStatusBadge({ blocked }: { blocked: boolean }) {
  return (
    <Badge
      variant="outline"
      className={blocked ? CUSTOMER_ACCOUNT_BADGE_INACTIVE : CUSTOMER_ACCOUNT_BADGE_ACTIVE}
      asChild={false}
    >
      {blocked ? 'Inactive' : 'Active'}
    </Badge>
  )
}

const VIP_CLASS =
  'px-2 py-1 border border-dashed border-amber-600/45 bg-amber-500/[0.1] font-medium text-amber-950 dark:border-amber-400/55 dark:bg-amber-400/12 dark:text-amber-50 normal-case tracking-normal text-xs'

const NORMAL_CLASS =
  'px-2 py-1 border border-dashed border-slate-400/85 bg-slate-500/[0.07] font-medium text-slate-800 dark:border-zinc-500/50 dark:bg-zinc-500/15 dark:text-zinc-50 normal-case tracking-normal text-xs'

export function CustomerTypeBadge({ customerType }: { customerType: CustomerType }) {
  const isVip = customerType === CustomerType.VIP
  return (
    <Badge variant="outline" className={isVip ? VIP_CLASS : NORMAL_CLASS} asChild={false}>
      {isVip ? 'VIP' : 'Normal'}
    </Badge>
  )
}
