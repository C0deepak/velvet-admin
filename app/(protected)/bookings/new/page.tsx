import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookingForm } from './booking-form'

export default function NewBookingPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="-ml-2 size-9" asChild>
          <Link href="/bookings">
            <ArrowLeftIcon className="size-4" weight="bold" />
          </Link>
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">New Booking</h1>
          <p className="text-sm text-muted-foreground">Create a new booking for a customer.</p>
        </div>
      </div>

      <BookingForm />
    </div>
  )
}
