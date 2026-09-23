/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as ExcelJS from 'exceljs';

/** A column of a generated sheet: the header text the regulator expects, and the row key it reads. */
export interface XlsxColumn {
  header: string;
  key: string;
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Writes rows to a downloaded .xlsx.
 *
 * `headerLines` are written above the table header — the CBN weekly return files a block of them once per
 * submission, which a flat sheet cannot express.
 */
export async function downloadXlsx(
  fileName: string,
  columns: XlsxColumn[],
  rows: Record<string, any>[],
  headerLines: string[] = [],
  sheetName = 'Report'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  headerLines.forEach((line) => worksheet.addRow([line]));
  if (headerLines.length) {
    worksheet.addRow([]);
  }

  const headerRow = worksheet.addRow(columns.map((column) => column.header));
  headerRow.font = { bold: true };

  rows.forEach((row) => worksheet.addRow(columns.map((column) => row[column.key] ?? '')));

  worksheet.columns.forEach((column, index) => {
    column.width = Math.max(columns[index]?.header.length ?? 10, 18);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_MIME }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
