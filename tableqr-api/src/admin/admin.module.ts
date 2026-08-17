import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { BillingModule } from '../billing/billing.module'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { UploadService } from './upload.service'
@Module({ imports: [AuthModule, BillingModule], controllers: [AdminController], providers: [AdminService, UploadService] })
export class AdminModule {}
