/* Copyright Contributors to the Open Cluster Management project */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { Page } from '@playwright/test';

/**
 * Trigger the export-CSV flow and capture the file download.
 *
 * Playwright's `page.waitForEvent('download')` fires as soon as the browser
 * starts a download — we then `saveAs()` to a temp directory so the file
 * is accessible to the test process.
 */
export async function downloadCSV(
  page: Page,
  triggerDownload: () => Promise<void>
): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    triggerDownload(),
  ]);
  const downloadDir = path.join(process.cwd(), 'test-results', 'csv-downloads');
  fs.mkdirSync(downloadDir, { recursive: true });
  const suggested = path.basename(download.suggestedFilename());
  const ext = path.extname(suggested);
  const base = path.basename(suggested, ext);
  const uniqueSuffix = crypto.randomUUID().slice(0, 8);
  const safeName = `${base}-${uniqueSuffix}${ext}`;
  const filePath = path.resolve(downloadDir, safeName);
  if (!filePath.startsWith(path.resolve(downloadDir) + path.sep)) {
    throw new Error(`Download filename escapes download directory: ${safeName}`);
  }
  await download.saveAs(filePath);
  return filePath;
}

/**
 * Parse a CSV file into an array of row objects keyed by column header.
 * Uses a minimal built-in parser (no external dependency).
 */
export function parseCSV(filePath: string): Record<string, string>[] {
  const allowedRoot = path.resolve(process.cwd(), 'test-results', 'csv-downloads') + path.sep;
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(allowedRoot)) {
    throw new Error(`Refusing to read CSV outside allowed directory: ${resolved}`);
  }
  const content = fs.readFileSync(resolved, 'utf-8');
  const lines = parseCSVRows(content);
  if (lines.length === 0) return [];

  const headers = lines[0];
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? '';
    }
    rows.push(row);
  }

  return rows;
}

function parseCSVRows(content: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let fields: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < content.length && content[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current.trim());
        current = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && i + 1 < content.length && content[i + 1] === '\n') {
          i++;
        }
        fields.push(current.trim());
        if (fields.some((f) => f !== '')) {
          rows.push(fields);
        }
        fields = [];
        current = '';
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  if (fields.some((f) => f !== '')) {
    rows.push(fields);
  }

  return rows;
}

export function verifyCSVColumnsExist(
  rows: Record<string, string>[],
  expectedColumns: string[]
): void {
  if (rows.length === 0) {
    throw new Error('CSV file is empty — no rows to verify');
  }
  const actualColumns = Object.keys(rows[0]);
  for (const expected of expectedColumns) {
    if (!actualColumns.includes(expected)) {
      throw new Error(
        `Expected CSV column "${expected}" not found. Actual columns: ${actualColumns.join(', ')}`
      );
    }
  }
}

export function verifyCSVHasRows(rows: Record<string, string>[], minRows = 1): void {
  if (rows.length < minRows) {
    throw new Error(`Expected at least ${minRows} CSV row(s) but got ${rows.length}`);
  }
}
