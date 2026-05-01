'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ChauffeurGender, MaritalStatus } from './schema'

export const CHAUFFEUR_ACCOUNT_ACTIVE =
  'px-2 py-1 border bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 font-medium normal-case tracking-normal text-xs'

export const CHAUFFEUR_ACCOUNT_INACTIVE =
  'px-2 py-1 border bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 font-medium normal-case tracking-normal text-xs'

export function ChauffeurAccountStatusBadge({ blocked }: { blocked: boolean }) {
  return (
    <Badge
      variant="outline"
      className={blocked ? CHAUFFEUR_ACCOUNT_INACTIVE : CHAUFFEUR_ACCOUNT_ACTIVE}
      asChild={false}
    >
      {blocked ? 'Inactive' : 'Active'}
    </Badge>
  )
}

export function ChauffeurRatingBadge({ rating }: { rating?: number | null }) {
  if (rating == null || Number.isNaN(rating)) {
    return <span className="text-xs tabular-nums text-muted-foreground">No rating</span>
  }
  const weak = rating <= 2

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs tabular-nums font-medium tracking-normal normal-case',
        weak ? 'text-red-600 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'
      )}
      aria-label={`Rating ${rating.toFixed(1)}`}
    >
      <span aria-hidden className="leading-none">
        ★
      </span>
      <span>{rating.toFixed(1)}</span>
    </span>
  )
}

const SOFT_BADGE_CLASS =
  'normal-case tracking-normal text-xs border border-border bg-muted/40 text-muted-foreground'

export function ChauffeurMetaBadge({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (!value) return null
  return (
    <Badge variant="outline" className={SOFT_BADGE_CLASS} asChild={false}>
      {label}: {value}
    </Badge>
  )
}

export function genderLabel(g: ChauffeurGender): string {
  switch (g) {
    case ChauffeurGender.MALE:
      return 'Male'
    case ChauffeurGender.FEMALE:
      return 'Female'
    default:
      return 'Other'
  }
}

export function maritalLabel(m: MaritalStatus): string {
  switch (m) {
    case MaritalStatus.SINGLE:
      return 'Single'
    case MaritalStatus.MARRIED:
      return 'Married'
    case MaritalStatus.DIVORCED:
      return 'Divorced'
    case MaritalStatus.WIDOWED:
      return 'Widowed'
    default:
      return m
  }
}
