import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare } from 'bcryptjs'
import { PrismaService } from '../prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async loginStaff(pin: string) {
    const user = await this.prisma.authUser.findFirst({
      where: { role: 'STAFF', isActive: true, pinHash: { not: null } },
    })
    if (!user?.pinHash || !(await compare(pin, user.pinHash))) this.reject()
    return this.response(user.id, 'staff', user.displayName)
  }

  async loginOwner(email: string, password: string) {
    const user = await this.prisma.authUser.findFirst({
      where: { role: 'OWNER', isActive: true, email },
    })
    if (!user?.passwordHash || !(await compare(password, user.passwordHash))) this.reject()
    return this.response(user.id, 'owner', user.displayName)
  }

  private async response(id: string, role: 'staff' | 'owner', displayName: string) {
    return {
      token: await this.jwt.signAsync({ sub: id, role, displayName }),
      role,
      displayName,
    }
  }

  private reject(): never {
    throw new UnauthorizedException('Thông tin đăng nhập không đúng.')
  }
}
