import { setupWorker } from 'msw/browser'
import { chaos, type ChaosConfig } from './chaos.js'
import { debugHandlers, handlers } from './handlers.js'

export interface StartMockWorkerOptions {
  showChaosPanel?: boolean
}

export async function startMockWorker(options: StartMockWorkerOptions = {}): Promise<void> {
  const worker = setupWorker(...handlers, ...debugHandlers)
  await worker.start({ onUnhandledRequest: 'bypass' })
  if (options.showChaosPanel) mountChaosPanel()
}

export function mountChaosPanel(): () => void {
  const existing = document.querySelector<HTMLElement>('[data-tableqr-chaos-panel]')
  if (existing) return () => existing.remove()

  const panel = document.createElement('details')
  panel.dataset.tableqrChaosPanel = ''
  panel.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:99999;background:#fff;color:#222;border:1px solid #aaa;border-radius:8px;padding:8px;font:12px system-ui;box-shadow:0 2px 12px #0003;max-width:260px'
  const summary = document.createElement('summary')
  summary.textContent = 'Mock chaos'
  summary.style.cursor = 'pointer'
  panel.append(summary)

  const controls: Array<{ key: keyof ChaosConfig; label: string; type: 'checkbox' | 'number'; step?: string }> = [
    { key: 'minDelayMs', label: 'Trễ tối thiểu (ms)', type: 'number' },
    { key: 'maxDelayMs', label: 'Trễ tối đa (ms)', type: 'number' },
    { key: 'errorRate', label: 'Tỉ lệ lỗi (0–1)', type: 'number', step: '0.1' },
    { key: 'offline', label: 'Offline', type: 'checkbox' },
    { key: 'forceSessionClosed', label: 'Ép SESSION_CLOSED', type: 'checkbox' },
    { key: 'forceItemsUnavailable', label: 'Ép ITEMS_UNAVAILABLE', type: 'checkbox' },
  ]

  for (const control of controls) {
    const label = document.createElement('label')
    label.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:6px'
    label.append(control.label)
    const input = document.createElement('input')
    input.type = control.type
    input.step = control.step ?? '1'
    const current = chaos.get()[control.key]
    if (control.type === 'checkbox') input.checked = Boolean(current)
    else input.value = String(current)
    input.addEventListener('change', () => {
      const value = control.type === 'checkbox' ? input.checked : Number(input.value)
      chaos.set({ [control.key]: value })
    })
    label.append(input)
    panel.append(label)
  }

  const reset = document.createElement('button')
  reset.type = 'button'
  reset.textContent = 'Mặc định'
  reset.style.cssText = 'margin-top:8px'
  reset.addEventListener('click', () => {
    chaos.reset()
    panel.remove()
    mountChaosPanel()
  })
  panel.append(reset)
  document.body.append(panel)
  return () => panel.remove()
}
