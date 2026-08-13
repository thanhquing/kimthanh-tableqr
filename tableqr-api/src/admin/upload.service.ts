import { HttpException, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp, { type Sharp } from 'sharp'

export const MAX_MENU_IMAGE_BYTES = 5 * 1024 * 1024
const MENU_IMAGE_WIDTH = 480
const MENU_IMAGE_HEIGHT = 270
const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const SUPPORTED_FORMATS = new Set(['jpeg', 'png', 'webp'])

export type UploadedImage = {
  buffer: Buffer
  mimetype: string
  size: number
}

function fail(message: string): never {
  throw new HttpException({ error: { code: 'VALIDATION_ERROR', message, details: null } }, 400)
}

@Injectable()
export class UploadService {
  private readonly directory = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads')

  async saveMenuImage(file: UploadedImage | undefined) {
    if (!file) fail('Chọn một ảnh món để tải lên.')
    if (file.size > MAX_MENU_IMAGE_BYTES) fail('Ảnh tối đa 5 MB.')
    if (!SUPPORTED_MIME_TYPES.has(file.mimetype)) fail('Chỉ nhận ảnh JPG, PNG hoặc WebP.')
    if (!Buffer.isBuffer(file.buffer)) fail('Không thể đọc dữ liệu ảnh. Vui lòng tải lại.')

    let image: Sharp
    try {
      image = sharp(file.buffer, { failOn: 'error', limitInputPixels: 20_000_000 }).rotate()
      const metadata = await image.metadata()
      if (!metadata.format || !SUPPORTED_FORMATS.has(metadata.format)) {
        fail('Tệp tải lên không phải ảnh JPG, PNG hoặc WebP hợp lệ.')
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      fail('Không thể đọc ảnh. Vui lòng chọn ảnh khác.')
    }

    let content: Buffer
    try {
      content = await image
        .resize(MENU_IMAGE_WIDTH, MENU_IMAGE_HEIGHT, { fit: 'cover', position: 'attention' })
        .webp({ quality: 60, effort: 4, smartSubsample: true })
        .toBuffer()
    } catch {
      fail('Không thể tối ưu ảnh. Vui lòng chọn ảnh khác.')
    }

    const filename = `${randomUUID()}.webp`
    await mkdir(this.directory, { recursive: true })
    await writeFile(join(this.directory, filename), content, { flag: 'wx' })
    return { imageUrl: `/uploads/${filename}` }
  }
}
