import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/app'
import { AppErrorBoundary } from './app/app-error-boundary'
import { AppProviders } from './app/app-providers'
import './styles/index.css'

async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_USE_MOCK !== 'true') return

  const { startMockWorker } = await import('@kimthanh-tableqr/mock/browser')
  await startMockWorker({ showChaosPanel: import.meta.env.DEV })
}

async function bootstrap(): Promise<void> {
  await enableMocking()

  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Không tìm thấy phần tử gốc của ứng dụng.')

  createRoot(rootElement).render(
    <StrictMode>
      <AppErrorBoundary>
        <AppProviders>
          <App />
        </AppProviders>
      </AppErrorBoundary>
    </StrictMode>,
  )
}

void bootstrap()
