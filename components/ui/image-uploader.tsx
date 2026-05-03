'use client'

import { useRef, useState } from 'react'
import { ImageIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ImageUploaderProps = {
  value: string | null | undefined
  onFileSelected: (file: File) => void | Promise<void>
  disabled?: boolean
  busy?: boolean
  accept?: string
  className?: string
  previewClassName?: string
  emptyHint?: string
  previewAlt?: string
}

export function ImageUploader({
  value,
  onFileSelected,
  disabled,
  busy,
  accept = 'image/*',
  className,
  previewClassName,
  emptyHint = 'No image yet',
  previewAlt = '',
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const trimmed = typeof value === 'string' ? value.trim() : ''
  const hasUrl = trimmed.length > 0
  /** URL that last failed to render (clears automatically when `value` changes to a different URL). */
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const loadFailed = hasUrl && failedUrl === trimmed
  const showPhoto = hasUrl && !loadFailed

  function openPicker() {
    if (disabled || busy) return
    inputRef.current?.click()
  }

  async function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!f) return
    await onFileSelected(f)
  }

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void onInputChange(e)}
      />

      <div
        className={cn(
          'relative h-[4.75rem] w-[6.25rem] shrink-0 overflow-hidden rounded-none border border-border bg-muted/40',
          previewClassName
        )}
      >
        <div className="relative size-full">
          {showPhoto ? (
            <img
              src={trimmed}
              alt={previewAlt}
              className="size-full object-cover"
              onError={() => setFailedUrl(trimmed)}
            />
          ) : (
            <button
              type="button"
              disabled={disabled || busy}
              onClick={openPicker}
              className={cn(
                'flex size-full flex-col items-center justify-center gap-1 px-2 text-center transition-colors',
                'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                'disabled:pointer-events-none disabled:opacity-50'
              )}
            >
              <ImageIcon className="size-5 opacity-50" weight="duotone" />
              <span className="max-w-[5.25rem] text-center text-[9px] font-medium leading-tight tracking-wide">
                {loadFailed ? 'Preview failed' : emptyHint}
              </span>
            </button>
          )}
        </div>
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
            <span className="text-xs font-medium text-muted-foreground">Uploading…</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:pt-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-1.5"
          disabled={disabled || busy}
          onClick={openPicker}
        >
          <PencilSimpleIcon className="size-3.5" weight="bold" />
          {hasUrl ? 'Change image' : 'Choose image'}
        </Button>
      </div>
    </div>
  )
}
