/**
 * Canonical form of a customer-typed transfer reference (bank transfer, Sham
 * Cash or Syriatel Cash transaction id), used to make sure one transfer can
 * only ever pay one order:
 *   - Arabic-Indic (٠-٩) and Persian (۰-۹) digits → 0-9
 *   - invisible direction marks / zero-width characters removed
 *   - all whitespace removed, upper-cased
 * " ١٢٣ abc 45" and "123ABC45" are the same reference.
 */
export function normalizePaymentReference(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf))
    .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, 200);
}
