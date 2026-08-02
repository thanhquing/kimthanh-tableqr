import { WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

export function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine)

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  return isOffline ? <div className="guest-offline-notice" role="alert"><WifiOff size={18} />Không có kết nối mạng.</div> : null
}
