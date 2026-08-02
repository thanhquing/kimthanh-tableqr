import { useQuery } from '@tanstack/react-query'
import { getGuestBootstrap } from '../../lib/api/guest'

export const tableSessionQueryKey = (qrToken: string) => ['guest-table-session', qrToken] as const

export function useTableSession(qrToken: string | undefined) {
  return useQuery({
    enabled: Boolean(qrToken),
    queryFn: () => getGuestBootstrap(qrToken ?? ''),
    queryKey: qrToken ? tableSessionQueryKey(qrToken) : ['guest-table-session', 'missing'],
  })
}
