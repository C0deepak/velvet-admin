import { cn } from '@/lib/utils'

export function Loader({ className }: { className?: string }) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      <div className="absolute h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-primary/40 animation-duration-[0.6s]" />
    </div>
  )
}
