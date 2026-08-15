import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { AdminService } from './admin.service'
import { AuthService } from '../auth/auth.service'
import { MAX_MENU_IMAGE_BYTES, type UploadedImage, UploadService } from './upload.service'
@Controller('admin') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('owner')
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly uploads: UploadService, private readonly auth: AuthService) {}
  @Get('categories') categories(@CurrentUser() user: AuthenticatedUser) { return this.admin.categories(user.restaurantId) }
  @Post('categories') createCategory(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) { return this.admin.createCategory(user.restaurantId, body) }
  @Patch('categories/:id') updateCategory(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.admin.updateCategory(user.restaurantId, id, body) }
  @Delete('categories/:id') deleteCategory(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.admin.deleteCategory(user.restaurantId, id) }
  @Get('items') items(@CurrentUser() user: AuthenticatedUser, @Query('categoryId') categoryId?: string) { return this.admin.items(user.restaurantId, categoryId) }
  @Post('items') createItem(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) { return this.admin.createItem(user.restaurantId, body) }
  @Patch('items/:id') updateItem(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.admin.updateItem(user.restaurantId, id, body) }
  @Delete('items/:id') deleteItem(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.admin.deleteItem(user.restaurantId, id) }
  @Post('uploads/images') @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_MENU_IMAGE_BYTES } })) uploadImage(@UploadedFile() file: UploadedImage | undefined) { return this.uploads.saveMenuImage(file) }
  @Get('tables') tables(@CurrentUser() user: AuthenticatedUser) { return this.admin.tables(user.restaurantId) }
  @Post('tables') createTable(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) { return this.admin.createTable(user.restaurantId, body) }
  @Patch('tables/:id') updateTable(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.admin.updateTable(user.restaurantId, id, body) }
  @Delete('tables/:id') deleteTable(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.admin.deleteTable(user.restaurantId, id) }
  @Get('account') account(@CurrentUser() user: AuthenticatedUser) { return this.admin.account(user.id, user.restaurantId) }
  @Get('restaurant') restaurant(@CurrentUser() user: AuthenticatedUser) { return this.admin.restaurant(user.restaurantId) }
  @Post('staff-pairing') staffPairing(@CurrentUser() user: AuthenticatedUser) { return this.auth.createStaffDevicePairing(user.restaurantId) }
  @Patch('staff-pin') updateStaffPin(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) { return this.admin.updateStaffPin(user.restaurantId, body) }
  @Patch('restaurant') updateRestaurant(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) { return this.admin.updateRestaurant(user.restaurantId, body) }
}
