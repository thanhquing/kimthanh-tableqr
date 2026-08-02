export type ClassValue = false | null | undefined | string

export function cx(...values: ClassValue[]): string | undefined {
  const className = values.filter(Boolean).join(' ')
  return className.length > 0 ? className : undefined
}
