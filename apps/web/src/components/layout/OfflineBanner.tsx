import { WifiOff } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { t } from '../../i18n'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine)
  if (online) return null

  return (
    <p
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-900"
    >
      <WifiOff className="size-4" aria-hidden />
      {t.shell.offline}
    </p>
  )
}
