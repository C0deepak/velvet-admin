import { CalendarCheckIcon } from '@phosphor-icons/react/dist/ssr'
import { Card, CardContent, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage and track your bookings.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-6">
          <CardTitle>Bookings</CardTitle>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {['ID', 'Customer', 'Pickup', 'Drop-off', 'Date', 'Chauffeur', 'Status'].map(
                    (h) => (
                      <th
                        key={h}
                        className="pb-3 pr-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground last:pr-0"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <CalendarCheckIcon className="size-8" weight="duotone" />
                      <p className="text-sm font-medium">No bookings yet</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
