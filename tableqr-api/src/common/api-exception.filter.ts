import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
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
    const message = typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string' ? body.message : isHttpException ? exception.message : 'Có lỗi hệ thống, vui lòng thử lại.'
    const code = status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 400 ? 'VALIDATION_ERROR' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR'
    const error = customError ?? { code, message, details: null }
    response.status(status).json({ error })
  }
}
