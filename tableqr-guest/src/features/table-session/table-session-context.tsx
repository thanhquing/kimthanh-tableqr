import type { GuestBootstrapResponse } from '@kimthanh-tableqr/contracts'
import { createContext, type ReactNode, useContext } from 'react'

interface TableSessionContextValue {
  readonly bootstrap: GuestBootstrapResponse
  readonly qrToken: string
}

const TableSessionContext = createContext<TableSessionContextValue | null>(null)

interface TableSessionProviderProps extends TableSessionContextValue {
  readonly children: ReactNode
}

export function TableSessionProvider({ bootstrap, children, qrToken }: TableSessionProviderProps) {
  return (
    <TableSessionContext.Provider value={{ bootstrap, qrToken }}>
      {children}
    </TableSessionContext.Provider>
  )
}

export function useTableSessionContext(): TableSessionContextValue {
  const context = useContext(TableSessionContext)
  if (!context) throw new Error('useTableSessionContext phải nằm trong TableSessionProvider.')
  return context
}
