import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare } from 'bcryptjs'
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
}
