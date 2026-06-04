import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined, currency?: string | null): string {
  const symbol = currency || "Rs."
  const value = amount ?? 0
  return `${symbol} ${value.toLocaleString()}`
}
