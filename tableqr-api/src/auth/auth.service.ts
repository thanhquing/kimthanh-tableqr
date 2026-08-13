import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare } from 'bcryptjs'
import { createHash, randomBytes } from 'node:crypto'
import { PrismaService } from '../prisma.service'
import type { AuthenticatedUser } from './auth.types'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async loginStaff(staffLoginCode: string, pin: string) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { staffLoginCode: staffLoginCode.trim().toUpperCase() } })
    if (!restaurant) this.reject()
    const user = await this.prisma.authUser.findFirst({
      where: { restaurantId: restaurant!.id, role: 'STAFF', isActive: true, pinHash: { not: null } },
    })
    if (!user?.pinHash || !(await compare(pin, user.pinHash))) this.reject()
    return this.response(user.id, 'staff', user.displayName, restaurant!.id)
  }

  async loginOwner(email: string, password: string) {
    const user = await this.prisma.authUser.findFirst({
      where: { role: 'OWNER', isActive: true, email },
    })
    if (!user?.passwordHash || !(await compare(password, user.passwordHash))) this.reject()
    return this.response(user.id, 'owner', user.displayName, user.restaurantId)
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
    await this.prisma.$transaction(async (tx) => {
      await tx.staffDevicePairing.deleteMany({ where: { restaurantId, OR: [{ claimedAt: null }, { expiresAt: { lte: new Date() } }] } })
      await tx.staffDevicePairing.create({ data: { restaurantId, tokenHash: this.hashDevicePairingToken(token), expiresAt } })
    })
    const base = (process.env.STAFF_BASE_URL ?? 'http://staff.tableqr.localhost:8080').replace(/\/$/, '')
    return { staffPairingUrl: `${base}/pair/${encodeURIComponent(token)}`, expiresAt }
  }

  async claimStaffDevicePairing(token: string) {
    const tokenHash = this.hashDevicePairingToken(token)
    const result = await this.prisma.$transaction(async (tx) => {
      const pairing = await tx.staffDevicePairing.findFirst({
        where: { tokenHash, claimedAt: null, expiresAt: { gt: new Date() } },
        include: { restaurant: { select: { staffLoginCode: true } } },
      })
      if (!pairing) return null
      const claimed = await tx.staffDevicePairing.updateMany({ where: { id: pairing.id, claimedAt: null }, data: { claimedAt: new Date() } })
      return claimed.count ? pairing.restaurant.staffLoginCode : null
    })
    if (!result) throw new HttpException({ error: { code: 'PAIRING_TOKEN_INVALID', message: 'Mã ghép thiết bị không hợp lệ hoặc đã hết hạn.', details: null } }, 401)
    return { staffLoginCode: result }
  }

  private async response(id: string, role: 'staff' | 'owner', displayName: string, restaurantId: string) {
    return {
      token: await this.jwt.signAsync({ sub: id, role, displayName, restaurantId }),
      role,
      displayName,
    }
  }

  private reject(): never {
    throw new UnauthorizedException('Thông tin đăng nhập không đúng.')
  }

  private hashDevicePairingToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
