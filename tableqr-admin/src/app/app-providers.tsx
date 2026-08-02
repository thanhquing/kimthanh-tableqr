import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AdminAuthProvider } from '../features/auth/auth-context'

export function AppProviders({ children }: { readonly children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }))
  return <QueryClientProvider client={client}><BrowserRouter><AdminAuthProvider>{children}</AdminAuthProvider></BrowserRouter></QueryClientProvider>
}
