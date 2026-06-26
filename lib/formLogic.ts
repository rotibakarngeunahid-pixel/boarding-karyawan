// ============================================================
// Evaluasi aturan kondisional form onboarding (mirror logika backend).
// Dipakai form publik onboarding & input karyawan manual admin.
// ============================================================

import type { FieldCondition, FormField } from '@/types';

export function ruleMatches(
  cond: FieldCondition | null,
  values: Record<string, string>,
): boolean {
  if (!cond) return false;
  const actual = values[cond.field] ?? '';
  return cond.op === '!=' ? actual !== cond.value : actual === cond.value;
}

export function isVisible(f: FormField, values: Record<string, string>): boolean {
  return f.show_if ? ruleMatches(f.show_if, values) : true;
}

export function isRequired(f: FormField, values: Record<string, string>): boolean {
  if (f.wajib === 1) return true;
  return f.wajib_if ? ruleMatches(f.wajib_if, values) : false;
}
