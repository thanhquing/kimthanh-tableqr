import { SetMetadata } from '@nestjs/common'

export const ROLE_METADATA_KEY = 'roles'
export const Roles = (...roles: Array<'staff' | 'owner'>) => SetMetadata(ROLE_METADATA_KEY, roles)
