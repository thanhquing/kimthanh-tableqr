import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { Request, Response } from 'express'

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiException')

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const isFileTooLarge = typeof exception === 'object' && exception !== null && 'code' in exception && exception.code === 'LIMIT_FILE_SIZE'
    if (isFileTooLarge) {
      response.status(HttpStatus.BAD_REQUEST).json({ error: { code: 'VALIDATION_ERROR', message: 'Ảnh tối đa 5 MB.', details: null } })
      return
    }
    const isHttpException = exception instanceof HttpException
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const body = isHttpException ? exception.getResponse() : null
    const customError = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'object' ? body.error : null
    const rawMessage = typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string' ? body.message : isHttpException ? exception.message : 'Có lỗi hệ thống, vui lòng thử lại.'
    const code = status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 400 ? 'VALIDATION_ERROR' : status === 404 ? 'NOT_FOUND' : status === HttpStatus.TOO_MANY_REQUESTS ? 'RATE_LIMITED' : 'INTERNAL_ERROR'
    // Throttler toàn cục ném chuỗi tiếng Anh; khách không bao giờ được thấy nó.
    const message = status === HttpStatus.TOO_MANY_REQUESTS ? 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' : rawMessage
    const error = customError ?? { code, message, details: null }
    // Lỗi ngoài dự kiến phải để lại dấu vết: không log thì không thể đặt alert
    // và mọi sự cố production chỉ còn là "khách bảo lỗi" (`SA-12`).
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const request = host.switchToHttp().getRequest<Request>()
      this.logger.error(`${request.method} ${request.originalUrl} → ${status}`, exception instanceof Error ? exception.stack : String(exception))
    }
    response.status(status).json({ error })
  }
}
