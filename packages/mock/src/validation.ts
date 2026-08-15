import {
  ORDER_STATUS,
  STAFF_CALL_STATUS,
  STAFF_CALL_TYPE,
  type AdminLoginRequest,
  type CreateCategoryRequest,
  type CreateMenuItemRequest,
  type CreateOrderRequest,
  type CreateStaffCallRequest,
  type CreateTableRequest,
  type StaffLoginRequest,
  type UpdateCategoryRequest,
  type UpdateMenuItemRequest,
  type UpdateOrderStatusRequest,
  type UpdateRestaurantRequest,
  type UpdateStaffPinRequest,
  type UpdateStaffCallRequest,
  type UpdateTableRequest,
} from '@kimthanh-tableqr/contracts'
import { validationError } from './mock-error.js'

type JsonObject = Record<string, unknown>

function object(value: unknown): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw validationError({ body: 'Body phải là một object JSON.' })
  }
  return value as JsonObject
}

function stringField(source: JsonObject, key: string, optional = false): string | undefined {
  const value = source[key]
  if (value === undefined && optional) return undefined
  if (typeof value !== 'string' || value.trim() === '') {
    throw validationError({ [key]: 'Phải là chuỗi không rỗng.' })
  }
  return value.trim()
}

function nullableStringField(source: JsonObject, key: string, optional = false): string | null | undefined {
  const value = source[key]
  if (value === undefined && optional) return undefined
  if (value === null) return null
  if (typeof value !== 'string') throw validationError({ [key]: 'Phải là chuỗi hoặc null.' })
  return value.trim() || null
}

function intField(source: JsonObject, key: string, optional = false, min = 0): number | undefined {
  const value = source[key]
  if (value === undefined && optional) return undefined
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
    throw validationError({ [key]: `Phải là số nguyên lớn hơn hoặc bằng ${min}.` })
  }
  return value
}

function boolField(source: JsonObject, key: string, optional = false): boolean | undefined {
  const value = source[key]
  if (value === undefined && optional) return undefined
  if (typeof value !== 'boolean') throw validationError({ [key]: 'Phải là boolean.' })
  return value
}

export function parseStaffLogin(value: unknown): StaffLoginRequest {
  const body = object(value)
  return { staffLoginCode: stringField(body, 'staffLoginCode')!, pin: stringField(body, 'pin')! }
}

export function parseAdminLogin(value: unknown): AdminLoginRequest {
  const body = object(value)
  return { email: stringField(body, 'email')!, password: stringField(body, 'password')! }
}

export function parseCreateOrder(value: unknown): CreateOrderRequest {
  const body = object(value)
  const note = nullableStringField(body, 'note')
  if (!Array.isArray(body.items)) throw validationError({ items: 'Phải là một mảng.' })
  const items = body.items.map((raw, index) => {
    let item: JsonObject
    try {
      item = object(raw)
      return {
        menuItemId: stringField(item, 'menuItemId')!,
        quantity: intField(item, 'quantity', false, 1)!,
        note: nullableStringField(item, 'note'),
      }
    } catch (error) {
      if (error instanceof Error) throw validationError({ [`items.${index}`]: error.message })
      throw error
    }
  })
  return { note: note ?? null, items: items.map((item) => ({ ...item, note: item.note ?? null })) }
}

export function parseCreateCall(value: unknown): CreateStaffCallRequest {
  const body = object(value)
  const type = stringField(body, 'type')
  if (!STAFF_CALL_TYPE.includes(type as (typeof STAFF_CALL_TYPE)[number])) {
    throw validationError({ type: 'Loại yêu cầu không hợp lệ.' })
  }
  return { type: type as CreateStaffCallRequest['type'] }
}

export function parseOrderStatus(value: unknown): UpdateOrderStatusRequest {
  const body = object(value)
  const status = stringField(body, 'status')
  if (!ORDER_STATUS.includes(status as (typeof ORDER_STATUS)[number])) {
    throw validationError({ status: 'Trạng thái đơn không hợp lệ.' })
  }
  return { status: status as UpdateOrderStatusRequest['status'] }
}

export function parseCallStatus(value: unknown): UpdateStaffCallRequest {
  const body = object(value)
  const status = stringField(body, 'status')
  if (!STAFF_CALL_STATUS.includes(status as (typeof STAFF_CALL_STATUS)[number])) {
    throw validationError({ status: 'Trạng thái yêu cầu không hợp lệ.' })
  }
  return { status: status as UpdateStaffCallRequest['status'] }
}

export function parseCreateCategory(value: unknown): CreateCategoryRequest {
  const body = object(value)
  return { name: stringField(body, 'name')!, sortOrder: intField(body, 'sortOrder')! }
}

export function parseUpdateCategory(value: unknown): UpdateCategoryRequest {
  const body = object(value)
  const result: UpdateCategoryRequest = {}
  const name = stringField(body, 'name', true)
  const sortOrder = intField(body, 'sortOrder', true)
  const isActive = boolField(body, 'isActive', true)
  if (name !== undefined) result.name = name
  if (sortOrder !== undefined) result.sortOrder = sortOrder
  if (isActive !== undefined) result.isActive = isActive
  return result
}

export function parseCreateItem(value: unknown): CreateMenuItemRequest {
  const body = object(value)
  return {
    categoryId: stringField(body, 'categoryId')!,
    name: stringField(body, 'name')!,
    description: nullableStringField(body, 'description') ?? null,
    priceVnd: intField(body, 'priceVnd')!,
    imageUrl: nullableStringField(body, 'imageUrl') ?? null,
    sortOrder: intField(body, 'sortOrder')!,
  }
}

export function parseUpdateItem(value: unknown): UpdateMenuItemRequest {
  const body = object(value)
  const result: UpdateMenuItemRequest = {}
  const categoryId = stringField(body, 'categoryId', true)
  const name = stringField(body, 'name', true)
  const description = nullableStringField(body, 'description', true)
  const priceVnd = intField(body, 'priceVnd', true)
  const imageUrl = nullableStringField(body, 'imageUrl', true)
  const sortOrder = intField(body, 'sortOrder', true)
  const isAvailable = boolField(body, 'isAvailable', true)
  if (categoryId !== undefined) result.categoryId = categoryId
  if (name !== undefined) result.name = name
  if (description !== undefined) result.description = description
  if (priceVnd !== undefined) result.priceVnd = priceVnd
  if (imageUrl !== undefined) result.imageUrl = imageUrl
  if (sortOrder !== undefined) result.sortOrder = sortOrder
  if (isAvailable !== undefined) result.isAvailable = isAvailable
  return result
}

export function parseCreateTable(value: unknown): CreateTableRequest {
  const body = object(value)
  return {
    code: stringField(body, 'code')!,
    displayName: stringField(body, 'displayName')!,
    sortOrder: intField(body, 'sortOrder')!,
  }
}

export function parseUpdateTable(value: unknown): UpdateTableRequest {
  const body = object(value)
  if ('qrToken' in body) throw validationError({ qrToken: 'Không được phép thay đổi mã QR.' })
  const result: UpdateTableRequest = {}
  const code = stringField(body, 'code', true)
  const displayName = stringField(body, 'displayName', true)
  const sortOrder = intField(body, 'sortOrder', true)
  const isActive = boolField(body, 'isActive', true)
  if (code !== undefined) result.code = code
  if (displayName !== undefined) result.displayName = displayName
  if (sortOrder !== undefined) result.sortOrder = sortOrder
  if (isActive !== undefined) result.isActive = isActive
  return result
}

export function parseUpdateRestaurant(value: unknown): UpdateRestaurantRequest {
  const body = object(value)
  const result: UpdateRestaurantRequest = {}
  const name = stringField(body, 'name', true)
  const logoUrl = nullableStringField(body, 'logoUrl', true)
  const address = nullableStringField(body, 'address', true)
  if (name !== undefined) result.name = name
  if (logoUrl !== undefined) result.logoUrl = logoUrl
  if (address !== undefined) result.address = address
  return result
}

export function parseUpdateStaffPin(value: unknown): UpdateStaffPinRequest {
  const body = object(value)
  const pin = stringField(body, 'pin')!
  if (!/^\d{6}$/.test(pin)) throw validationError({ pin: 'PIN phải gồm đúng 6 chữ số.' })
  return { pin }
}
