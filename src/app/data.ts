import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContract, type PromiseContract } from '../lib/contract.ts';
import type { AuditStatus } from '../lib/audit.ts';
import { formatUsd } from '../lib/money.ts';

export const PRE_FIX_SHA = 'ed3dbaf';
export const STOREFRONT_URL = 'http://127.0.0.1:4173/';

export type PolicyInfo = {
  path: string;
  text: string;
  rules: string[];
  baselineRule: string | null;
};

export function loadAppContract(): PromiseContract {
  return loadContract();
}

export function readPolicy(repoRoot: string): PolicyInfo | null {
  const absolute = join(repoRoot, 'docs', 'store-policy.md');
  if (!existsSync(absolute)) return null;
  const text = readFileSync(absolute, 'utf8');
  const clean = (line: string): string => line.replaceAll('**', '').replaceAll('`', '');
  const rules = text
    .split(/\r?\n/)
    .filter((line) => /^\d+\.\s/.test(line))
    .map((line) => clean(line.trim()));
  return {
    path: 'docs/store-policy.md',
    text,
    rules,
    baselineRule: rules.find((line) => line.includes('$9.00')) ?? null,
  };
}

export function statusClass(status: AuditStatus): string {
  return `status--${status.toLowerCase().replaceAll('_', '-')}`;
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number): string => String(part).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(
    date.getUTCSeconds(),
  )} UTC`;
}

export function formatCents(cents: number | null | undefined): string {
  return typeof cents === 'number' ? formatUsd(cents) : '—';
}

export function humanize(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
