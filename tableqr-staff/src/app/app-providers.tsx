import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { StaffAuthProvider } from '../features/auth/auth-context'
import { SoundProvider } from '../features/sound/sound-context'
export function AppProviders({ children }: { readonly children: ReactNode }) { const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } })); return <QueryClientProvider client={client}><BrowserRouter><StaffAuthProvider><SoundProvider>{children}</SoundProvider></StaffAuthProvider></BrowserRouter></QueryClientProvider> }
