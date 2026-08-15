import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare, hash } from 'bcryptjs'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'
import type { AuthenticatedUser } from './auth.types'

type OwnerRegistrationBody = { restaurantName?: unknown; ownerDisplayName?: unknown; email?: unknown; password?: unknown; staffPin?: unknown }
type RestaurantSummary = { id: string; name: string }

const fail = (status: number, code: string, message: string, details: unknown = null): never => { throw new HttpException({ error: { code, message, details } }, status) }

function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}

function slugify(value: string): string {
  const slug = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || 'quan-moi'
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async loginStaff(staffLoginCode: string, pin: string) {
    const normalizedCode = staffLoginCode.trim().toUpperCase()
    const restaurant = await this.prisma.withStaffLoginCode(normalizedCode, (tx) => tx.restaurant.findUnique({ where: { staffLoginCode: normalizedCode } }))
    if (!restaurant) this.reject()
    const user = await this.prisma.withTenant(restaurant!.id, (tx) => tx.authUser.findFirst({
      where: { restaurantId: restaurant!.id, role: 'STAFF', isActive: true, pinHash: { not: null } },
    }))
    if (!user?.pinHash || !(await compare(pin, user.pinHash))) this.reject()
    return this.response(user.id, 'staff', user.displayName, restaurant!.id, restaurant!)
  }

  async loginOwner(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase()
    const user = await this.prisma.withOwnerEmail(normalizedEmail, (tx) => tx.authUser.findFirst({
      where: { role: 'OWNER', isActive: true, email: normalizedEmail },
    }))
    if (!user?.passwordHash || !(await compare(password, user.passwordHash))) this.reject()
    const restaurant = await this.prisma.withTenant(user.restaurantId, (tx) => tx.restaurant.findUniqueOrThrow({ where: { id: user.restaurantId }, select: { id: true, name: true } }))
    return this.response(user.id, 'owner', user.displayName, user.restaurantId, restaurant)
  }

  async registerOwner(body: OwnerRegistrationBody) {
    const restaurantName = typeof body.restaurantName === 'string' ? body.restaurantName.trim() : ''
    const ownerDisplayName = typeof body.ownerDisplayName === 'string' ? body.ownerDisplayName.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const staffPin = typeof body.staffPin === 'string' ? body.staffPin : ''
    if (restaurantName.length < 2 || restaurantName.length > 100 || ownerDisplayName.length < 2 || ownerDisplayName.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128 || !/^\d{6}$/.test(staffPin)) {
      fail(400, 'VALIDATION_ERROR', 'Thông tin đăng ký không hợp lệ.', { fields: { restaurantName: 'Tên quán 2–100 ký tự.', ownerDisplayName: 'Tên chủ quán 2–80 ký tự.', email: 'Email hợp lệ.', password: 'Mật khẩu tối thiểu 8 ký tự.', staffPin: 'PIN nhân viên gồm 6 chữ số.' } })
    }
    const [passwordHash, pinHash] = await Promise.all([hash(password, 12), hash(staffPin, 12)])
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const restaurantId = randomUUID()
      const createdAt = new Date()
      const trialEndsAt = addCalendarMonths(createdAt, 2)
      const staffLoginCode = randomBytes(4).toString('hex').toUpperCase()
      const publicSlug = `${slugify(restaurantName).slice(0, 48)}-${randomBytes(3).toString('hex')}`
      try {
        const created = await this.prisma.withOwnerRegistration(restaurantId, email, async (tx) => {
          if (await tx.authUser.findFirst({ where: { email }, select: { id: true } })) fail(409, 'EMAIL_ALREADY_IN_USE', 'Email này đã được dùng để đăng ký quán.')
          const restaurant = await tx.restaurant.create({ data: { id: restaurantId, name: restaurantName, publicSlug, staffLoginCode, trialEndsAt, billingStatus: 'TRIAL' } })
          const owner = await tx.authUser.create({ data: { restaurantId, role: 'OWNER', email, passwordHash, displayName: ownerDisplayName } })
          await tx.authUser.create({ data: { restaurantId, role: 'STAFF', pinHash, displayName: 'Nhân viên quầy' } })
          const mainCategoryId = randomUUID()
          const drinkCategoryId = randomUUID()
          await tx.menuCategory.createMany({ data: [
            { id: mainCategoryId, restaurantId, name: 'Món chính', sortOrder: 1 },
            { id: drinkCategoryId, restaurantId, name: 'Đồ uống', sortOrder: 2 },
          ] })
          await tx.menuItem.createMany({ data: [
            { id: randomUUID(), restaurantId, categoryId: mainCategoryId, name: 'Cơm gà', description: 'Món mẫu — chủ quán có thể sửa hoặc xoá.', priceVnd: 45000, sortOrder: 1 },
            { id: randomUUID(), restaurantId, categoryId: mainCategoryId, name: 'Phở bò', description: 'Món mẫu — chủ quán có thể sửa hoặc xoá.', priceVnd: 50000, sortOrder: 2 },
            { id: randomUUID(), restaurantId, categoryId: drinkCategoryId, name: 'Trà đá', description: 'Món mẫu — chủ quán có thể sửa hoặc xoá.', priceVnd: 5000, sortOrder: 1 },
          ] })
          await tx.diningTable.createMany({ data: Array.from({ length: 4 }, (_, index) => ({ id: randomUUID(), restaurantId, code: `B${String(index + 1).padStart(2, '0')}`, displayName: `Bàn ${index + 1}`, qrToken: randomBytes(18).toString('base64url'), sortOrder: index + 1 })) })
          return { owner, restaurant }
        })
        const auth = await this.response(created.owner.id, 'owner', created.owner.displayName, created.restaurant.id, created.restaurant)
        return { ...auth, restaurant: { id: created.restaurant.id, name: created.restaurant.name, staffLoginCode: created.restaurant.staffLoginCode }, trialEndsAt: created.restaurant.trialEndsAt }
      } catch (error: unknown) {
        if (error instanceof HttpException) throw error
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target ?? '')
          if (target.includes('email')) fail(409, 'EMAIL_ALREADY_IN_USE', 'Email này đã được dùng để đăng ký quán.')
          continue
        }
        throw error
      }
    }
    fail(503, 'REGISTRATION_UNAVAILABLE', 'Không thể tạo mã quán. Vui lòng thử lại.')
  }

  async createStaffStreamTicket(user: AuthenticatedUser) {
    return {
      ticket: await this.jwt.signAsync(
        { sub: user.id, role: user.role, displayName: user.displayName, restaurantId: user.restaurantId, tokenUse: 'staff_stream' },
        { expiresIn: 60 },
      ),
      expiresInSeconds: 60,
    }
  }

  async createStaffDevicePairing(restaurantId: string) {
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + 10 * 60_000)
    await this.prisma.withTenant(restaurantId, async (tx) => {
      await tx.staffDevicePairing.deleteMany({ where: { restaurantId, OR: [{ claimedAt: null }, { expiresAt: { lte: new Date() } }] } })
      await tx.staffDevicePairing.create({ data: { restaurantId, tokenHash: this.hashDevicePairingToken(token), expiresAt } })
    })
    const base = (process.env.STAFF_BASE_URL ?? 'http://staff.tableqr.localhost:8080').replace(/\/$/, '')
    return { staffPairingUrl: `${base}/pair/${encodeURIComponent(token)}`, expiresAt }
  }

  async claimStaffDevicePairing(token: string) {
    const tokenHash = this.hashDevicePairingToken(token)
    const restaurantId = await this.prisma.withStaffPairingToken(tokenHash, async (tx) => {
      const pairing = await tx.staffDevicePairing.findFirst({
        where: { tokenHash, claimedAt: null, expiresAt: { gt: new Date() } },
      })
      if (!pairing) return null
      const claimed = await tx.staffDevicePairing.updateMany({ where: { id: pairing.id, claimedAt: null }, data: { claimedAt: new Date() } })
      return claimed.count ? pairing.restaurantId : null
    })
    if (!restaurantId) throw new HttpException({ error: { code: 'PAIRING_TOKEN_INVALID', message: 'Mã ghép thiết bị không hợp lệ hoặc đã hết hạn.', details: null } }, 401)
    const restaurant = await this.prisma.withTenant(restaurantId, (tx) => tx.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { staffLoginCode: true } }))
    return { staffLoginCode: restaurant.staffLoginCode }
  }

  private async response(id: string, role: 'staff' | 'owner', displayName: string, restaurantId: string, restaurant?: RestaurantSummary) {
    return {
      token: await this.jwt.signAsync({ sub: id, role, displayName, restaurantId }),
      role,
      displayName,
      ...(restaurant ? { restaurant } : {}),
    }
  }

  private reject(): never {
    throw new UnauthorizedException('Thông tin đăng nhập không đúng.')
  }

  private hashDevicePairingToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
