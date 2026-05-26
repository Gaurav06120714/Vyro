import type { Page } from 'playwright';

export interface ExtractOptions {
  selector?: string;
  includeHtml?: boolean;
  maxLength?: number;
}

export interface ExtractedContent {
  url: string;
  html: string;
  text: string;
  title: string;
}

export async function extractContent(page: Page, options: ExtractOptions = {}): Promise<ExtractedContent> {
  const { selector, maxLength = 50000 } = options;

  const root = selector ? page.locator(selector) : page.locator('body');

  const [html, text] = await Promise.all([
    root.innerHTML().catch(() => ''),
    root.innerText().catch(() => ''),
  ]);

  return {
    url: page.url(),
    title: await page.title(),
    html: html.slice(0, maxLength),
    text: text.slice(0, maxLength),
  };
}

export async function extractTableData(page: Page, tableSelector: string): Promise<Record<string, string>[]> {
  return page.evaluate((sel) => {
    const table = document.querySelector(sel);
    if (!table) return [];

    const headers: string[] = [];
    const headerCells = table.querySelectorAll('thead th, thead td, tr:first-child th');
    headerCells.forEach((cell) => headers.push(cell.textContent?.trim() ?? ''));

    const rows: Record<string, string>[] = [];
    const bodyRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');

    bodyRows.forEach((row) => {
      const cells = row.querySelectorAll('td, th');
      const rowData: Record<string, string> = {};
      cells.forEach((cell, i) => {
        const header = headers[i] ?? `col_${i}`;
        rowData[header] = cell.textContent?.trim() ?? '';
      });
      if (Object.values(rowData).some((v) => v !== '')) {
        rows.push(rowData);
      }
    });

    return rows;
  }, tableSelector);
}
