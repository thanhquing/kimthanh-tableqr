type TotalsModule = typeof import('@kimthanh-tableqr/contracts')

const contracts: Promise<TotalsModule> = import('@kimthanh-tableqr/contracts')

export async function calcOrderTotalFromContracts(items: Array<{ unitPriceVndSnapshot: number; quantity: number }>) {
  return (await contracts).calcOrderTotal(items)
}

export async function calcSessionTotalFromContracts(orders: Array<{ status: 'NEW' | 'PREPARING' | 'SERVED' | 'CANCELLED'; items: Array<{ unitPriceVndSnapshot: number; quantity: number }> }>) {
  return (await contracts).calcSessionTotal(orders)
}
