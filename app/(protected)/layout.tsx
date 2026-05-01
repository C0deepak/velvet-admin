import { AppSidebar } from '@/components/layouts/app-sidebar'
import AppNavbar from '@/components/layouts/app-navbar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Route } from '@/config/route'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Route type="protected">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppNavbar />
          <main className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </Route>
  )
}
