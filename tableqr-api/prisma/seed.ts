import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import {
  CATEGORIES,
  MENU_ITEMS,
  RESTAURANT,
  SEEDED_SESSION,
  TABLES,
} from '@kimthanh-tableqr/mock/fixtures'

const prisma = new PrismaClient()

/** Chuyen ID fixture on dinh thanh UUID de phu hop cot PostgreSQL. */
function fixtureId(value: string): string {
  const hex = createHash('sha256').update(`kimthanh-tableqr:${value}`).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

async function seed() {
  const restaurantId = fixtureId(RESTAURANT.id)
  const categoryIds = new Map(CATEGORIES.map((category) => [category.id, fixtureId(category.id)]))
  const itemIds = new Map(MENU_ITEMS.map((item) => [item.id, fixtureId(item.id)]))
  const tableIds = new Map(TABLES.map((table) => [table.id, fixtureId(table.id)]))

  await prisma.$transaction(async (tx) => {
    await tx.restaurant.upsert({
      where: { id: restaurantId },
      update: { name: RESTAURANT.name, logoUrl: RESTAURANT.logoUrl, address: RESTAURANT.address },
      create: { id: restaurantId, name: RESTAURANT.name, logoUrl: RESTAURANT.logoUrl, address: RESTAURANT.address },
    })

    for (const category of CATEGORIES) {
      const id = categoryIds.get(category.id)
      if (!id) throw new Error(`Fixture thiếu ID danh mục ${category.id}`)
      await tx.menuCategory.upsert({
        where: { id },
        update: { name: category.name, sortOrder: category.sortOrder, isActive: category.isActive },
        create: { id, name: category.name, sortOrder: category.sortOrder, isActive: category.isActive },
      })
    }

    for (const item of MENU_ITEMS) {
      const id = itemIds.get(item.id)
      const categoryId = categoryIds.get(item.categoryId)
      if (!id || !categoryId) throw new Error(`Fixture món không hợp lệ: ${item.id}`)
      const data = {
        categoryId,
        name: item.name,
        description: item.description,
        priceVnd: item.priceVnd,
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        sortOrder: item.sortOrder,
      }
      await tx.menuItem.upsert({ where: { id }, update: data, create: { id, ...data } })
    }

    for (const table of TABLES) {
      const id = tableIds.get(table.id)
      if (!id) throw new Error(`Fixture thiếu ID bàn ${table.id}`)
      const data = {
        code: table.code,
        displayName: table.displayName,
        qrToken: table.qrToken,
        isActive: table.isActive,
        sortOrder: table.sortOrder,
      }
      await tx.diningTable.upsert({ where: { id }, update: data, create: { id, ...data } })
    }

    const sessionId = fixtureId(SEEDED_SESSION.sessionId)
    const tableId = tableIds.get(SEEDED_SESSION.tableId)
    if (!tableId) throw new Error(`Fixture thiếu bàn của session ${SEEDED_SESSION.sessionId}`)
    const now = Date.now()
    await tx.tableSession.upsert({
      where: { id: sessionId },
      update: { tableId, openedAt: new Date(now - 27 * 60_000), closedAt: null, status: 'OPEN', paidAt: null },
      create: { id: sessionId, tableId, openedAt: new Date(now - 27 * 60_000), status: 'OPEN' },
    })

    for (const seededOrder of SEEDED_SESSION.orders) {
      const orderId = fixtureId(`ord-seed-${seededOrder.sequenceNo}`)
      const data = {
        tableId,
        status: seededOrder.status,
        note: null,
        createdAt: new Date(now - seededOrder.minutesAgo * 60_000),
      }
      await tx.order.upsert({
        where: { sessionId_sequenceNo: { sessionId, sequenceNo: seededOrder.sequenceNo } },
        update: data,
        create: { id: orderId, sessionId, sequenceNo: seededOrder.sequenceNo, ...data },
      })

      for (const [index, seededItem] of seededOrder.items.entries()) {
        const menuItemId = itemIds.get(seededItem.menuItemId)
        const menuItem = MENU_ITEMS.find((item) => item.id === seededItem.menuItemId)
        if (!menuItemId || !menuItem) throw new Error(`Fixture thiếu món ${seededItem.menuItemId}`)
        const id = fixtureId(`order-item-seed-${seededOrder.sequenceNo}-${index + 1}`)
        const itemData = {
          orderId,
          menuItemId,
          nameSnapshot: menuItem.name,
          unitPriceVndSnapshot: menuItem.priceVnd,
          quantity: seededItem.quantity,
          note: seededItem.note,
        }
        await tx.orderItem.upsert({ where: { id }, update: itemData, create: { id, ...itemData } })
      }
    }
  })
}

seed()
  .then(() => {
    console.info('Đã seed dữ liệu fixture cho Kim Thành TableQR.')
  })
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
