import { addToCart, calcCartItemCount, calcCartTotal, type CartLine, type MenuItem } from '@kimthanh-tableqr/contracts'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useReducer } from 'react'

interface CartContextValue {
  readonly addItem: (item: MenuItem, quantity: number, note?: string) => void
  readonly itemCount: number
  readonly lines: readonly CartLine[]
  readonly totalVnd: number
}

const CartContext = createContext<CartContextValue | null>(null)

type CartAction = { readonly type: 'add'; readonly line: CartLine } | { readonly type: 'hydrate'; readonly lines: CartLine[] }

function reducer(lines: readonly CartLine[], action: CartAction): readonly CartLine[] {
  if (action.type === 'hydrate') return action.lines
  return addToCart(lines, action.line)
}

function storageKey(sessionId: string): string {
  return `tableqr.cart.${sessionId}`
}

function readCart(sessionId: string): CartLine[] {
  try {
    const value = sessionStorage.getItem(storageKey(sessionId))
    const parsed: unknown = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed as CartLine[] : []
  } catch {
    return []
  }
}

export function CartProvider({ children, sessionId }: { readonly children: ReactNode; readonly sessionId: string }) {
  const [lines, dispatch] = useReducer(reducer, sessionId, readCart)

  useEffect(() => {
    dispatch({ type: 'hydrate', lines: readCart(sessionId) })
  }, [sessionId])

  useEffect(() => {
    sessionStorage.setItem(storageKey(sessionId), JSON.stringify(lines))
  }, [lines, sessionId])

  const value = useMemo<CartContextValue>(() => ({
    addItem: (item, quantity, note = '') => dispatch({
      type: 'add',
      line: { menuItemId: item.id, name: item.name, unitPriceVnd: item.priceVnd, quantity, note: note.trim() || null },
    }),
    itemCount: calcCartItemCount(lines),
    lines,
    totalVnd: calcCartTotal(lines),
  }), [lines])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart phải nằm trong CartProvider.')
  return context
}
