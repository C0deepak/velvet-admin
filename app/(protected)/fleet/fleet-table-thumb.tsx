'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const FRAME = cn(
  'flex h-[2.5rem] w-[3.25rem] shrink-0 overflow-hidden rounded-none border border-border bg-muted/40'
)

type FleetTableThumbProps = {
  src: string | null | undefined
  alt?: string
  className?: string
}

/** Small rectangular preview for fleet list tables */
export function FleetTableThumb({ src, alt = '', className }: FleetTableThumbProps) {
  const [failed, setFailed] = useState(false)
  const url = typeof src === 'string' ? src.trim() : ''
  const showImg = url.length > 0 && !failed

  return (
    <div className={cn(FRAME, className)}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary CDN / upload URLs
        <img
          src={url}
          alt={alt}
          className="size-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  )
}
