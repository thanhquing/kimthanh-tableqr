import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/app'
import { AppProviders } from './app/app-providers'
import './styles/index.css'

async function bootstrap() {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { startMockWorker } = await import('@kimthanh-tableqr/mock/browser')
    await startMockWorker({ showChaosPanel: import.meta.env.DEV })
  }
  const root = document.getElementById('root')
  if (!root) throw new Error('Không tìm thấy phần tử gốc của ứng dụng.')
  createRoot(root).render(<StrictMode><AppProviders><App /></AppProviders></StrictMode>)
}

void bootstrap()
