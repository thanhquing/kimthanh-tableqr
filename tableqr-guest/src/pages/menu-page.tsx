import { EmptyState } from '@kimthanh-tableqr/ui'
import { formatVnd, type MenuCategory, type MenuItem } from '@kimthanh-tableqr/contracts'
import { Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTableSessionContext } from '../features/table-session/table-session-context'

interface MenuGroup {
  readonly category: Pick<MenuCategory, 'id' | 'name' | 'sortOrder'>
  readonly items: readonly MenuItem[]
}

export function MenuPage() {
  const { bootstrap, qrToken } = useTableSessionContext()
  const navigate = useNavigate()
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [quickAddCounts, setQuickAddCounts] = useState<Record<string, number>>({})
  const groupRefs = useRef(new Map<string, HTMLElement>())

  const groups = useMemo<MenuGroup[]>(() => {
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

  useEffect(() => {
    setActiveCategoryId(groups[0]?.category.id ?? null)
  }, [groups])

  useEffect(() => {
    if (!groups.length || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting)
        if (visibleEntry) setActiveCategoryId(visibleEntry.target.id.replace('menu-category-', ''))
      },
      { rootMargin: '-112px 0px -70% 0px' },
    )

    const sections = [...groupRefs.current.values()]
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [groups])

  if (!groups.length) {
    return (
      <main className="guest-route-state">
        <EmptyState
          description="Vui lòng gọi nhân viên để được hỗ trợ gọi món."
          title="Quán chưa cập nhật thực đơn"
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

  return (
    <main className="guest-menu">
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
    </main>
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
