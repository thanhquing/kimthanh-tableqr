import { addToCart, calcCartItemCount, calcCartTotal, type CartLine, type MenuItem } from '@kimthanh-tableqr/contracts'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useReducer } from 'react'

interface CartContextValue {
  readonly addItem: (item: MenuItem, quantity: number, note?: string) => void
  readonly clear: () => void
  readonly itemCount: number
  readonly lines: readonly CartLine[]
  readonly removeLine: (index: number) => void
  readonly restoreLine: (line: CartLine) => void
  readonly totalVnd: number
  readonly updateQuantity: (index: number, quantity: number) => void
  readonly updateNote: (index: number, note: string) => void
}

const CartContext = createContext<CartContextValue | null>(null)

type CartAction = { readonly type: 'add'; readonly line: CartLine } | { readonly type: 'clear' } | { readonly type: 'hydrate'; readonly lines: CartLine[] } | { readonly type: 'note'; readonly index: number; readonly note: string } | { readonly type: 'remove'; readonly index: number } | { readonly type: 'quantity'; readonly index: number; readonly quantity: number }

function reducer(lines: readonly CartLine[], action: CartAction): readonly CartLine[] {
  if (action.type === 'hydrate') return action.lines
  if (action.type === 'clear') return []
  if (action.type === 'note') {
    const target = lines[action.index]
    return target ? addToCart(lines.filter((_, index) => index !== action.index), { ...target, note: action.note.trim() || null }) : lines
  }
  if (action.type === 'remove') return lines.filter((_, index) => index !== action.index)
  if (action.type === 'quantity') return action.quantity < 1 ? lines.filter((_, index) => index !== action.index) : lines.map((line, index) => index === action.index ? { ...line, quantity: action.quantity } : line)
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
    clear: () => dispatch({ type: 'clear' }),
    itemCount: calcCartItemCount(lines),
    lines,
    removeLine: (index) => dispatch({ type: 'remove', index }),
    restoreLine: (line) => dispatch({ type: 'add', line }),
    totalVnd: calcCartTotal(lines),
    updateQuantity: (index, quantity) => dispatch({ type: 'quantity', index, quantity }),
    updateNote: (index, note) => dispatch({ type: 'note', index, note }),
  }), [lines])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart phải nằm trong CartProvider.')
  return context
}
