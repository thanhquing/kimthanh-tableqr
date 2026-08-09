import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { StaffService } from './staff.service'

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('staff', 'owner')
export class StaffController {
  constructor(private readonly staff: StaffService) {}
  @Get('orders') orders(@Query('status') status?: string, @Query('since') since?: string) { return this.staff.orders(status, since) }
  @Patch('orders/:orderId/status') updateOrder(@Param('orderId') id: string, @Body() body: { status?: unknown }) { return this.staff.updateOrder(id, body.status) }
  @Get('tables') tables() { return this.staff.tables() }
  @Get('sessions/:sessionId') session(@Param('sessionId') id: string) { return this.staff.session(id) }
  @Post('sessions/:sessionId/pay') @HttpCode(HttpStatus.OK) pay(@Param('sessionId') id: string) { return this.staff.pay(id) }
  @Post('sessions/:sessionId/close') @HttpCode(HttpStatus.OK) close(@Param('sessionId') id: string) { return this.staff.close(id) }
  @Get('calls') calls(@Query('status') status?: string) { return this.staff.calls(status) }
  @Patch('calls/:callId') updateCall(@Param('callId') id: string, @Body() body: { status?: unknown }) { return this.staff.updateCall(id, body.status) }
}
