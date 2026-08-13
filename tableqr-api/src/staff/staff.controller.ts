import { Body, Controller, Get, HttpCode, HttpStatus, MessageEvent, Param, Patch, Post, Query, Sse, UseGuards } from '@nestjs/common'
import type { Observable } from 'rxjs'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { StaffStreamTicketGuard } from '../auth/staff-stream-ticket.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { StaffService } from './staff.service'
import { RealtimeService } from '../realtime/realtime.service'
import { AuthService } from '../auth/auth.service'

@Controller('staff')
@Roles('staff', 'owner')
export class StaffController {
  constructor(private readonly staff: StaffService, private readonly realtime: RealtimeService, private readonly auth: AuthService) {}
  @Sse('stream') @UseGuards(StaffStreamTicketGuard, RolesGuard) stream(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> { return this.realtime.stream(user.restaurantId) }
  @Post('stream-ticket') @UseGuards(JwtAuthGuard, RolesGuard) streamTicket(@CurrentUser() user: AuthenticatedUser) { return this.auth.createStaffStreamTicket(user) }
  @Get('orders') @UseGuards(JwtAuthGuard, RolesGuard) orders(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('since') since?: string) { return this.staff.orders(user.restaurantId, status, since) }
  @Patch('orders/:orderId/status') @UseGuards(JwtAuthGuard, RolesGuard) updateOrder(@CurrentUser() user: AuthenticatedUser, @Param('orderId') id: string, @Body() body: { status?: unknown }) { return this.staff.updateOrder(user.restaurantId, id, body.status) }
  @Get('tables') @UseGuards(JwtAuthGuard, RolesGuard) tables(@CurrentUser() user: AuthenticatedUser) { return this.staff.tables(user.restaurantId) }
  @Get('sessions/:sessionId') @UseGuards(JwtAuthGuard, RolesGuard) session(@CurrentUser() user: AuthenticatedUser, @Param('sessionId') id: string) { return this.staff.session(user.restaurantId, id) }
  @Post('sessions/:sessionId/pay') @UseGuards(JwtAuthGuard, RolesGuard) @HttpCode(HttpStatus.OK) pay(@CurrentUser() user: AuthenticatedUser, @Param('sessionId') id: string) { return this.staff.pay(user.restaurantId, id) }
  @Post('sessions/:sessionId/close') @UseGuards(JwtAuthGuard, RolesGuard) @HttpCode(HttpStatus.OK) close(@CurrentUser() user: AuthenticatedUser, @Param('sessionId') id: string) { return this.staff.close(user.restaurantId, id) }
  @Get('calls') @UseGuards(JwtAuthGuard, RolesGuard) calls(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: string) { return this.staff.calls(user.restaurantId, status) }
  @Patch('calls/:callId') @UseGuards(JwtAuthGuard, RolesGuard) updateCall(@CurrentUser() user: AuthenticatedUser, @Param('callId') id: string, @Body() body: { status?: unknown }) { return this.staff.updateCall(user.restaurantId, id, body.status) }
}
