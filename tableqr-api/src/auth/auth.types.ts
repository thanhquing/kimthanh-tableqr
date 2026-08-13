export type AuthenticatedUser = {
  id: string
  role: 'staff' | 'owner'
  displayName: string
  restaurantId: string
}
