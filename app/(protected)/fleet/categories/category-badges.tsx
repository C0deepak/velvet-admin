'use client'

import { Badge } from '@/components/ui/badge'

const ACTIVE =
  'px-2 py-1 border bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 font-medium normal-case tracking-normal text-xs'

const INACTIVE =
  'px-2 py-1 border bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 font-medium normal-case tracking-normal text-xs'

export function CategoryActiveBadge({ active }: { active: number }) {
  const on = active === 1
  return (
    <Badge variant="outline" className={on ? ACTIVE : INACTIVE} asChild={false}>
      {on ? 'Active' : 'Inactive'}
    </Badge>
  )
}
