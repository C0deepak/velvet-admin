'use client'

import { useCallback, useEffect, useState } from 'react'
import { MagnifyingGlassIcon, PlusIcon, UserCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { getCustomersPaginated, toApiPhoneDigits } from './api'
import type { Customer } from './types'
import { getApiErrorMessage } from '@/helper/api-error-message'
import { CustomerFormSheet } from './customer-form-sheet'
import { CustomerAccountStatusBadge, CustomerTypeBadge } from './customer-badges'

const PAGE_SIZE = 20

const COLUMNS = ['Customer', 'Email', 'Rides', 'Type', 'Status']

export default function CustomersPage() {
  const [page, setPage] = useState(1)
  const [phoneFilter, setPhoneFilter] = useState('')
  const [phoneQuery, setPhoneQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetCustomerId, setSheetCustomerId] = useState<number | null>(null)

  const refetchList = useCallback(() => {
    const phoneParam = phoneQuery.trim() ? toApiPhoneDigits(phoneQuery.trim()) : undefined
    return getCustomersPaginated({
      pageNo: page,
      pageSize: PAGE_SIZE,
      ...(phoneParam && { phone: phoneParam }),
    })
      .then((res) => {
        setCustomers(res.data.data)
        setTotal(res.data.total)
        setPages(Math.max(1, res.data.pages))
      })
      .catch((err) => setError(getApiErrorMessage(err)))
  }, [page, phoneQuery])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })
    const phoneParam = phoneQuery.trim() ? toApiPhoneDigits(phoneQuery.trim()) : undefined
    void getCustomersPaginated({
      pageNo: page,
      pageSize: PAGE_SIZE,
      ...(phoneParam && { phone: phoneParam }),
    })
      .then((res) => {
        if (cancelled) return
        queueMicrotask(() => {
          if (cancelled) return
          setCustomers(res.data.data)
          setTotal(res.data.total)
          setPages(Math.max(1, res.data.pages))
        })
      })
      .catch((err) => {
        if (!cancelled) queueMicrotask(() => setError(getApiErrorMessage(err)))
      })
      .finally(() => {
        if (!cancelled) queueMicrotask(() => setLoading(false))
      })
    return () => {
      cancelled = true
    }
  }, [page, phoneQuery])

  function applyPhoneSearch() {
    setPage(1)
    setPhoneQuery(phoneFilter.trim())
  }

  function openNewCustomer() {
    setSheetCustomerId(null)
    setSheetOpen(true)
  }

  function openEditCustomer(id: number) {
    setSheetCustomerId(id)
    setSheetOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Search, create, and edit customer profiles.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openNewCustomer}>
          <PlusIcon className="size-4" weight="bold" />
          New customer
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Filter by phone (91 added when missing)
          </p>
          <InputGroup className="w-full">
            <InputGroupAddon align="inline-start">
              <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="e.g. 6299388225 or 916299388225"
              value={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyPhoneSearch()}
            />
          </InputGroup>
        </div>
        <Button type="button" variant="secondary" onClick={applyPhoneSearch}>
          Search
        </Button>
        {phoneQuery && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPhoneFilter('')
              setPhoneQuery('')
              setPage(1)
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <Card>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="pb-3 pr-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground last:pr-0"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      className="py-16 text-center text-sm text-muted-foreground"
                    >
                      Loading customers…
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <UserCircleIcon className="size-8" weight="duotone" />
                        <p className="text-sm font-medium">No customers found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => {
                    const national = c.phone?.startsWith(c.countryCode)
                      ? c.phone?.slice(c.countryCode.length)
                      : c.phone
                    const phoneLine = `+${c.countryCode} ${national ?? ''}`

                    return (
                      <tr
                        key={c.id}
                        onClick={() => openEditCustomer(c.id)}
                        className="cursor-pointer border-b border-border/50 last:border-0 transition-colors hover:bg-muted/30"
                      >
                        <td className="py-3 pr-6">
                          <p className="font-medium">{c.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{phoneLine}</p>
                        </td>
                        <td className="max-w-56 truncate py-3 pr-6 text-muted-foreground">
                          {c.email ?? '—'}
                        </td>
                        <td className="py-3 pr-6 tabular-nums">{c.metadata.numberOfRides}</td>
                        <td className="py-3 pr-6">
                          <CustomerTypeBadge customerType={c.metadata.customerType} />
                        </td>
                        <td className="py-3">
                          <CustomerAccountStatusBadge blocked={c.blocked} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={pages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            className="mt-4 border-t border-border pt-4"
          />
        </CardContent>
      </Card>

      <CustomerFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        customerId={sheetCustomerId}
        onSaved={() => void refetchList()}
      />
    </div>
  )
}
