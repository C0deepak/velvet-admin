import { Suspense } from 'react'
import { BookingDetail } from './booking-detail'

export default function BookingDetailPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Loading booking…</p>}>
      <BookingDetail />
    </Suspense>
  )
}
