'use client'

import { Badge } from '@/components/ui/badge'

const ON =
  'px-2 py-1 border bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 font-medium normal-case tracking-normal text-xs'
const OFF =
  'px-2 py-1 border bg-muted/40 text-muted-foreground border-border font-medium normal-case tracking-normal text-xs'

export function VehicleAvailableBadge({ available }: { available: boolean }) {
  return (
    <Badge variant="outline" className={available ? ON : OFF} asChild={false}>
      {available ? 'Available' : 'Unavailable'}
    </Badge>
  )
}
