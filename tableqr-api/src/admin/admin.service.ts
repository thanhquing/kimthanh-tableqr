import { HttpException, Injectable } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import { PrismaService } from '../prisma.service'

const fail = (status: number, code: string, message: string): never => { throw new HttpException({ error: { code, message, details: null } }, status) }
const string = (value: unknown) => typeof value === 'string' ? value : undefined
const int = (value: unknown) => typeof value === 'number' && Number.isInteger(value) ? value : undefined

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  categories(restaurantId: string) { return this.prisma.withTenant(restaurantId, (tx) => tx.menuCategory.findMany({ where: { restaurantId }, orderBy: { sortOrder: 'asc' } })) }
  createCategory(restaurantId: string, body: Record<string, unknown>) {
    const name = string(body.name); const sortOrder = int(body.sortOrder)
    if (!name || sortOrder === undefined) fail(400, 'VALIDATION_ERROR', 'Danh mục không hợp lệ.')
    return this.prisma.withTenant(restaurantId, (tx) => tx.menuCategory.create({ data: { restaurantId, name: name!, sortOrder: sortOrder! } }))
  }
  async updateCategory(restaurantId: string, id: string, body: Record<string, unknown>) {
    return this.prisma.withTenant(restaurantId, async (tx) => {
      if (!await tx.menuCategory.findFirst({ where: { id, restaurantId } })) fail(404, 'CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục.')
      return tx.menuCategory.update({ where: { id }, data: { ...(string(body.name) ? { name: string(body.name) } : {}), ...(int(body.sortOrder) !== undefined ? { sortOrder: int(body.sortOrder) } : {}), ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}) } })
    })
  }
  async deleteCategory(restaurantId: string, id: string) {
    return this.prisma.withTenant(restaurantId, async (tx) => {
      if (await tx.menuItem.count({ where: { restaurantId, categoryId: id, deletedAt: null } })) fail(409, 'CATEGORY_NOT_EMPTY', 'Danh mục vẫn còn món.')
      if (!(await tx.menuCategory.deleteMany({ where: { id, restaurantId } })).count) fail(404, 'CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục.')
      return { id }
    })
  }
  items(restaurantId: string, categoryId?: string) { return this.prisma.withTenant(restaurantId, (tx) => tx.menuItem.findMany({ where: { restaurantId, deletedAt: null, ...(categoryId ? { categoryId } : {}) }, orderBy: { sortOrder: 'asc' } })) }
  async createItem(restaurantId: string, body: Record<string, unknown>) {
    const categoryId = string(body.categoryId); const name = string(body.name); const priceVnd = int(body.priceVnd); const sortOrder = int(body.sortOrder)
    if (!categoryId || !name || priceVnd === undefined || sortOrder === undefined) fail(400, 'VALIDATION_ERROR', 'Món không hợp lệ.')
    return this.prisma.withTenant(restaurantId, async (tx) => {
      if (!await tx.menuCategory.findFirst({ where: { id: categoryId, restaurantId } })) fail(404, 'CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục.')
      return tx.menuItem.create({ data: { restaurantId, categoryId: categoryId!, name: name!, priceVnd: priceVnd!, sortOrder: sortOrder!, description: string(body.description) ?? null, imageUrl: string(body.imageUrl) ?? null } })
    })
  }
  async updateItem(restaurantId: string, id: string, body: Record<string, unknown>) {
    return this.prisma.withTenant(restaurantId, async (tx) => {
      if (!await tx.menuItem.findFirst({ where: { id, restaurantId } })) fail(404, 'ITEM_NOT_FOUND', 'Không tìm thấy món.')
      const categoryId = string(body.categoryId)
      if (categoryId && !await tx.menuCategory.findFirst({ where: { id: categoryId, restaurantId } })) fail(404, 'CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục.')
      return tx.menuItem.update({ where: { id }, data: { ...(categoryId ? { categoryId } : {}), ...(string(body.name) ? { name: string(body.name) } : {}), ...(int(body.priceVnd) !== undefined ? { priceVnd: int(body.priceVnd) } : {}), ...(int(body.sortOrder) !== undefined ? { sortOrder: int(body.sortOrder) } : {}), ...(typeof body.description === 'string' || body.description === null ? { description: body.description } : {}), ...(typeof body.imageUrl === 'string' || body.imageUrl === null ? { imageUrl: body.imageUrl } : {}), ...(typeof body.isAvailable === 'boolean' ? { isAvailable: body.isAvailable } : {}) } })
    })
  }
  async deleteItem(restaurantId: string, id: string) { return this.prisma.withTenant(restaurantId, async (tx) => { if (!(await tx.menuItem.updateMany({ where: { id, restaurantId }, data: { deletedAt: new Date() } })).count) fail(404, 'ITEM_NOT_FOUND', 'Không tìm thấy món.'); return { id } }) }
  async tables(restaurantId: string) { const tables = await this.prisma.withTenant(restaurantId, (tx) => tx.diningTable.findMany({ where: { restaurantId }, orderBy: { sortOrder: 'asc' } })); const base = process.env.GUEST_BASE_URL ?? 'http://localhost:5173'; return { tables: tables.map((table) => ({ ...table, qrUrl: `${base}/t/${table.qrToken}` })) } }
  createTable(restaurantId: string, body: Record<string, unknown>) {
    const code = string(body.code); const displayName = string(body.displayName); const sortOrder = int(body.sortOrder)
    if (!code || !displayName || sortOrder === undefined) fail(400, 'VALIDATION_ERROR', 'Bàn không hợp lệ.')
    return this.prisma.withTenant(restaurantId, (tx) => tx.diningTable.create({ data: { restaurantId, code: code!, displayName: displayName!, sortOrder: sortOrder!, qrToken: randomBytes(18).toString('base64url') } }))
  }
  async updateTable(restaurantId: string, id: string, body: Record<string, unknown>) { return this.prisma.withTenant(restaurantId, async (tx) => { if (!await tx.diningTable.findFirst({ where: { id, restaurantId } })) fail(404, 'TABLE_NOT_FOUND', 'Không tìm thấy bàn.'); return tx.diningTable.update({ where: { id }, data: { ...(string(body.code) ? { code: string(body.code) } : {}), ...(string(body.displayName) ? { displayName: string(body.displayName) } : {}), ...(int(body.sortOrder) !== undefined ? { sortOrder: int(body.sortOrder) } : {}), ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}) } }) }) }
  async deleteTable(restaurantId: string, id: string) { return this.prisma.withTenant(restaurantId, async (tx) => { if (await tx.tableSession.count({ where: { restaurantId, tableId: id, status: 'OPEN' } })) fail(409, 'TABLE_HAS_OPEN_SESSION', 'Bàn đang có khách.'); if (!(await tx.diningTable.deleteMany({ where: { id, restaurantId } })).count) fail(404, 'TABLE_NOT_FOUND', 'Không tìm thấy bàn.'); return { id } }) }
  restaurant(restaurantId: string) { return this.prisma.withTenant(restaurantId, (tx) => tx.restaurant.findUniqueOrThrow({ where: { id: restaurantId } })) }
  updateRestaurant(restaurantId: string, body: Record<string, unknown>) { return this.prisma.withTenant(restaurantId, (tx) => tx.restaurant.update({ where: { id: restaurantId }, data: { ...(string(body.name) ? { name: string(body.name) } : {}), ...(typeof body.logoUrl === 'string' || body.logoUrl === null ? { logoUrl: body.logoUrl } : {}), ...(typeof body.address === 'string' || body.address === null ? { address: body.address } : {}) } })) }
}
