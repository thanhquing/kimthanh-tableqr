import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'

export type TenantTransaction = Prisma.TransactionClient

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async withTenant<T>(restaurantId: string, callback: (tx: TenantTransaction) => Promise<T>): Promise<T> {
    return this.withContext({ 'app.restaurant_id': restaurantId }, callback)
  }

  async withQrToken<T>(qrToken: string, callback: (tx: TenantTransaction) => Promise<T>): Promise<T> {
    return this.withContext({ 'app.qr_token': qrToken }, callback)
  }

  async withStaffLoginCode<T>(staffLoginCode: string, callback: (tx: TenantTransaction) => Promise<T>): Promise<T> {
    return this.withContext({ 'app.staff_login_code': staffLoginCode }, callback)
  }

  async withOwnerEmail<T>(email: string, callback: (tx: TenantTransaction) => Promise<T>): Promise<T> {
    return this.withContext({ 'app.owner_email': email }, callback)
  }

  async withOwnerRegistration<T>(restaurantId: string, email: string, callback: (tx: TenantTransaction) => Promise<T>): Promise<T> {
    return this.withContext({ 'app.restaurant_id': restaurantId, 'app.owner_email': email }, callback)
  }

  async withGuestSessionAccess<T>(sessionId: string, tokenHash: string, callback: (tx: TenantTransaction) => Promise<T>): Promise<T> {
    return this.withContext({ 'app.guest_session_id': sessionId, 'app.guest_access_token_hash': tokenHash }, callback)
  }

  async withStaffPairingToken<T>(tokenHash: string, callback: (tx: TenantTransaction) => Promise<T>): Promise<T> {
    return this.withContext({ 'app.staff_pairing_token_hash': tokenHash }, callback)
  }

  /**
   * Webhook is not authenticated as a restaurant. It may only resolve the
   * globally unique payment code; subsequent reads and writes must use
   * withTenant() after the owning restaurant has been found.
   */
  async withPaymentCode<T>(paymentCode: string, callback: (tx: TenantTransaction) => Promise<T>): Promise<T> {
    return this.withContext({ 'app.payment_code': paymentCode }, callback)
  }

  async setTenant(tx: TenantTransaction, restaurantId: string): Promise<void> {
    await tx.$executeRaw`SELECT set_config('app.restaurant_id', ${restaurantId}, true)`
  }

  private async withContext<T>(settings: Record<string, string>, callback: (tx: TenantTransaction) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(settings)) {
        await tx.$executeRaw`SELECT set_config(${key}, ${value}, true)`
      }
      return callback(tx)
    })
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
