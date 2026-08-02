import { BottomSheet, Button, EmptyState, QuantityStepper } from '@kimthanh-tableqr/ui'
import { formatVnd, removeVietnameseTones, type MenuCategory, type MenuItem } from '@kimthanh-tableqr/contracts'
import { Plus, Search, X } from 'lucide-react'
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTableSessionContext } from '../features/table-session/table-session-context'

interface MenuGroup {
  readonly category: Pick<MenuCategory, 'id' | 'name' | 'sortOrder'>
  readonly items: readonly MenuItem[]
}

export function MenuPage() {
  const { bootstrap, qrToken } = useTableSessionContext()
  const { itemId } = useParams()
  const navigate = useNavigate()
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [quickAddCounts, setQuickAddCounts] = useState<Record<string, number>>({})
  const [query, setQuery] = useState('')
  const [sheetNote, setSheetNote] = useState('')
  const [sheetQuantity, setSheetQuantity] = useState(1)
  const groupRefs = useRef(new Map<string, HTMLElement>())
  const searchInputRef = useRef<HTMLInputElement>(null)

  const allGroups = useMemo<MenuGroup[]>(() => {
    const itemsByCategory = new Map<string, MenuItem[]>()
    for (const item of bootstrap.items) {
      const items = itemsByCategory.get(item.categoryId) ?? []
      items.push(item)
      itemsByCategory.set(item.categoryId, items)
    }

    return [...bootstrap.categories]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((category) => ({
        category,
        items: (itemsByCategory.get(category.id) ?? []).sort(
          (left, right) => left.sortOrder - right.sortOrder,
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [bootstrap.categories, bootstrap.items])

  const groups = useMemo(() => {
    const normalizedQuery = removeVietnameseTones(query)
    if (!normalizedQuery) return allGroups

    return allGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => removeVietnameseTones(item.name).includes(normalizedQuery)),
      }))
      .filter((group) => group.items.length > 0)
  }, [allGroups, query])

  useEffect(() => {
    setActiveCategoryId(groups[0]?.category.id ?? null)
  }, [groups])

  useEffect(() => {
    setSheetNote('')
    setSheetQuantity(1)
  }, [itemId])

  useEffect(() => {
    if (!groups.length || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting)
        if (visibleEntry) setActiveCategoryId(visibleEntry.target.id.replace('menu-category-', ''))
      },
      { rootMargin: '-164px 0px -70% 0px' },
    )

    const sections = [...groupRefs.current.values()]
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [groups])

  if (!allGroups.length) {
    return (
      <main className="guest-route-state">
        <EmptyState
          description="Vui lòng gọi nhân viên để được hỗ trợ gọi món."
          title="Quán chưa cập nhật thực đơn"
        />
      </main>
    )
  }

  if (!groups.length) {
    return (
      <main className="guest-menu">
        <MenuSearch
          inputRef={searchInputRef}
          onChange={setQuery}
          onClear={() => setQuery('')}
          query={query}
        />
        <EmptyState
          action={<Button onClick={() => setQuery('')} variant="secondary">Xoá tìm kiếm</Button>}
          className="guest-menu__empty-search"
          description="Thử từ khoá khác, hoặc xem toàn bộ thực đơn."
          title="Không tìm thấy món nào"
        />
      </main>
    )
  }

  function scrollToCategory(categoryId: string) {
    setActiveCategoryId(categoryId)
    document.getElementById(`menu-category-${categoryId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const selectedItem = bootstrap.items.find((item) => item.id === itemId && item.isAvailable)

  function closeItemSheet() {
    navigate(`/t/${qrToken}`)
  }

  function addFromSheet() {
    if (!selectedItem) return
    setQuickAddCounts((counts) => ({
      ...counts,
      [selectedItem.id]: (counts[selectedItem.id] ?? 0) + sheetQuantity,
    }))
    closeItemSheet()
  }

  return (
    <main className="guest-menu">
      <div className="guest-menu-controls">
        <MenuSearch
          inputRef={searchInputRef}
          onChange={setQuery}
          onClear={() => setQuery('')}
          query={query}
        />
        <nav aria-label="Danh mục thực đơn" className="guest-category-tabs">
          <div className="guest-category-tabs__scroll" role="tablist">
            {groups.map(({ category }) => (
              <button
                aria-selected={category.id === activeCategoryId}
                className="guest-category-tab"
                key={category.id}
                onClick={() => scrollToCategory(category.id)}
                role="tab"
                type="button"
              >
                {category.name}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <div className="guest-menu__groups">
        {groups.map(({ category, items }) => (
          <section
            aria-labelledby={`menu-category-heading-${category.id}`}
            className="guest-menu-group"
            id={`menu-category-${category.id}`}
            key={category.id}
            ref={(element) => {
              if (element) groupRefs.current.set(category.id, element)
              else groupRefs.current.delete(category.id)
            }}
          >
            <h2 className="guest-menu-group__heading" id={`menu-category-heading-${category.id}`}>{category.name}</h2>
            <div className="guest-menu-group__items">
              {items.map((item) => (
                <MenuItemRow
                  item={item}
                  key={item.id}
                  onQuickAdd={() => {
                    setQuickAddCounts((counts) => ({
                      ...counts,
                      [item.id]: (counts[item.id] ?? 0) + 1,
                    }))
                  }}
                  onOpen={() => navigate(`/t/${qrToken}/item/${item.id}`)}
                  quantity={quickAddCounts[item.id] ?? 0}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      {selectedItem ? (
        <BottomSheet
          className="guest-item-sheet"
          description={selectedItem.description}
          isOpen
          media={<ItemSheetMedia item={selectedItem} />}
          onClose={closeItemSheet}
          title={selectedItem.name}
        >
          <div className="guest-item-sheet__quantity">
            <p className="guest-item-sheet__label">Số lượng</p>
            <QuantityStepper onChange={setSheetQuantity} value={sheetQuantity} />
          </div>
          <label className="guest-item-sheet__label" htmlFor="item-note">Ghi chú cho bếp</label>
          <textarea
            className="guest-item-sheet__note"
            id="item-note"
            onChange={(event) => setSheetNote(event.target.value)}
            placeholder="Ví dụ: ít đá, không rau..."
            rows={2}
            value={sheetNote}
          />
          <div className="guest-item-sheet__suggestions">
            {NOTE_SUGGESTIONS.map((suggestion) => {
              const selected = splitNote(sheetNote).includes(suggestion)
              return (
                <button
                  aria-pressed={selected}
                  key={suggestion}
                  onClick={() => setSheetNote(toggleSuggestion(sheetNote, suggestion))}
                  type="button"
                >
                  {suggestion}
                </button>
              )
            })}
          </div>
          <Button block onClick={addFromSheet} size="lg">
            Thêm vào giỏ · {formatVnd(selectedItem.priceVnd * sheetQuantity)}
          </Button>
        </BottomSheet>
      ) : null}
    </main>
  )
}

const NOTE_SUGGESTIONS = ['ít đá', 'không rau', 'thêm ớt', 'ít cay', 'không hành']

function ItemSheetMedia({ item }: { readonly item: MenuItem }) {
  if (item.imageUrl) {
    return <img alt="" className="guest-item-sheet__image" height={270} src={item.imageUrl} width={480} />
  }

  return <div aria-hidden="true" className="guest-item-sheet__image guest-item-sheet__image--placeholder">{item.name.charAt(0)}</div>
}

function splitNote(note: string): string[] {
  return note.split(',').map((part) => part.trim()).filter(Boolean)
}

function toggleSuggestion(note: string, suggestion: string): string {
  const parts = splitNote(note)
  return (parts.includes(suggestion) ? parts.filter((part) => part !== suggestion) : [...parts, suggestion]).join(', ')
}

interface MenuSearchProps {
  readonly inputRef: RefObject<HTMLInputElement>
  readonly onChange: (query: string) => void
  readonly onClear: () => void
  readonly query: string
}

function MenuSearch({ inputRef, onChange, onClear, query }: MenuSearchProps) {
  function clearSearch() {
    onClear()
    inputRef.current?.focus()
  }

  return (
    <div className="guest-menu-search">
      <div className="guest-menu-search__box">
        <Search aria-hidden="true" size={18} />
        <input
          aria-label="Tìm món"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Tìm món..."
          ref={inputRef}
          type="search"
          value={query}
        />
        {query ? (
          <button aria-label="Xoá tìm kiếm" className="guest-menu-search__clear" onClick={clearSearch} type="button">
            <X aria-hidden="true" size={16} strokeWidth={2.5} />
          </button>
        ) : null}
      </div>
    </div>
  )
}

interface MenuItemRowProps {
  readonly item: MenuItem
  readonly onOpen: () => void
  readonly onQuickAdd: () => void
  readonly quantity: number
}

function MenuItemRow({ item, onOpen, onQuickAdd, quantity }: MenuItemRowProps) {
  const image = item.imageUrl ? (
    <img alt="" decoding="async" height={88} loading="lazy" src={item.imageUrl} width={88} />
  ) : (
    <span aria-hidden="true" className="guest-menu-item__image-placeholder">{item.name.charAt(0)}</span>
  )

  if (!item.isAvailable) {
    return (
      <article aria-disabled="true" className="guest-menu-item guest-menu-item--unavailable">
        <div className="guest-menu-item__image">{image}</div>
        <div className="guest-menu-item__content">
          <h3 className="guest-menu-item__name">{item.name}</h3>
          {item.description ? <p className="guest-menu-item__description">{item.description}</p> : null}
          <div className="guest-menu-item__footer">
            <span className="guest-menu-item__price">{formatVnd(item.priceVnd)}</span>
            <span className="guest-menu-item__unavailable-label">Hết món</span>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="guest-menu-item">
      <button aria-label={`Xem chi tiết ${item.name}`} className="guest-menu-item__details" onClick={onOpen} type="button">
        <div className="guest-menu-item__image">{image}</div>
        <div className="guest-menu-item__content">
          <h3 className="guest-menu-item__name">{item.name}</h3>
          {item.description ? <p className="guest-menu-item__description">{item.description}</p> : null}
          <span className="guest-menu-item__price">{formatVnd(item.priceVnd)}</span>
        </div>
      </button>
      <span className="guest-menu-item__add-wrap">
        <button
          aria-label={`Thêm ${item.name}`}
          className="guest-menu-item__add"
          onClick={onQuickAdd}
          type="button"
        >
          <Plus aria-hidden="true" size={22} strokeWidth={2.5} />
        </button>
        {quantity ? <span aria-label={`Đã chọn ${quantity} ${item.name}`} className="guest-menu-item__quantity">{quantity}</span> : null}
      </span>
    </article>
  )
}
