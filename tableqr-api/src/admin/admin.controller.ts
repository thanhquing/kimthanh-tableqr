import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { AdminService } from './admin.service'
@Controller('admin') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('owner')
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('categories') categories() { return this.admin.categories() }
  @Post('categories') createCategory(@Body() body: Record<string, unknown>) { return this.admin.createCategory(body) }
  @Patch('categories/:id') updateCategory(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.admin.updateCategory(id, body) }
  @Delete('categories/:id') deleteCategory(@Param('id') id: string) { return this.admin.deleteCategory(id) }
  @Get('items') items(@Query('categoryId') categoryId?: string) { return this.admin.items(categoryId) }
  @Post('items') createItem(@Body() body: Record<string, unknown>) { return this.admin.createItem(body) }
  @Patch('items/:id') updateItem(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.admin.updateItem(id, body) }
  @Delete('items/:id') deleteItem(@Param('id') id: string) { return this.admin.deleteItem(id) }
  @Get('tables') tables() { return this.admin.tables() }
  @Post('tables') createTable(@Body() body: Record<string, unknown>) { return this.admin.createTable(body) }
  @Patch('tables/:id') updateTable(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.admin.updateTable(id, body) }
  @Delete('tables/:id') deleteTable(@Param('id') id: string) { return this.admin.deleteTable(id) }
  @Get('restaurant') restaurant() { return this.admin.restaurant() }
  @Patch('restaurant') updateRestaurant(@Body() body: Record<string, unknown>) { return this.admin.updateRestaurant(body) }
}
