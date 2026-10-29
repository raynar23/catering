// Client-side Excel export utility producing standardized PT Terminal Petikemas Surabaya spreadsheets
import ExcelJS from "exceljs";

export interface ExcelColumn<T> {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "center" | "right";
  format?: (row: T, index: number) => string | number | null | undefined;
}

export interface ExportToExcelOptions<T> {
  filename: string;
  sheetName?: string;
  title?: string;
  subtitle?: string;
  columns: ExcelColumn<T>[];
  data: T[];
}

// Generate and trigger download of styled Excel (.xlsx) file
export async function exportToExcel<T>({
  filename,
  sheetName = "Sheet1",
  title,
  subtitle,
  columns,
  data,
}: ExportToExcelOptions<T>): Promise<void> {
  const workbook = new (ExcelJS as any).Workbook();
  workbook.creator = "PT Terminal Petikemas Surabaya";
  workbook.lastModifiedBy = "Sistem Pengelolaan Catering TPS";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  let currentRow = 1;

  // Title block
  if (title) {
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = title;
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF003366" } };
    currentRow++;
  }

  // Subtitle / generated timestamp block
  if (subtitle || title) {
    const subCell = worksheet.getCell(currentRow, 1);
    const timeStr = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
    subCell.value = subtitle ? `${subtitle} (Diunduh: ${timeStr})` : `Diunduh pada: ${timeStr}`;
    subCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF6E6E73" } };
    currentRow++;
  }

  if (title || subtitle) {
    currentRow++; // Empty spacing row
  }

  const headerRowIndex = currentRow;

  // Render Table Headers
  columns.forEach((col, colIdx) => {
    const cell = worksheet.getCell(headerRowIndex, colIdx + 1);
    cell.value = col.header;
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF003366" },
    };
    cell.alignment = {
      horizontal: col.align || "left",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF002244" } },
      bottom: { style: "thin", color: { argb: "FF002244" } },
      left: { style: "thin", color: { argb: "FF002244" } },
      right: { style: "thin", color: { argb: "FF002244" } },
    };
  });
  worksheet.getRow(headerRowIndex).height = 24;
  currentRow++;

  // Render Data Rows
  data.forEach((item, rowIdx) => {
    const rowNum = currentRow;
    const isEven = rowIdx % 2 === 1;

    columns.forEach((col, colIdx) => {
      const cell = worksheet.getCell(rowNum, colIdx + 1);
      const val = col.format
        ? col.format(item, rowIdx)
        : (item as Record<string, unknown>)[col.key];

      cell.value = val !== undefined && val !== null ? (val as any) : "-";
      cell.font = { name: "Arial", size: 9, color: { argb: "FF1D1D1F" } };
      cell.alignment = {
        horizontal: col.align || (typeof val === "number" ? "right" : "left"),
        vertical: "middle",
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFF8FAFC" : "FFFFFFFF" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });

    worksheet.getRow(rowNum).height = 20;
    currentRow++;
  });

  // Calculate Column Widths
  columns.forEach((col, colIdx) => {
    let maxLen = col.header.length;
    data.forEach((item, rIdx) => {
      const val = col.format
        ? col.format(item, rIdx)
        : (item as Record<string, unknown>)[col.key];
      if (val !== undefined && val !== null) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    });

    const calculatedWidth = Math.max(col.width || 12, Math.min(maxLen + 4, 45));
    worksheet.getColumn(colIdx + 1).width = calculatedWidth;
  });

  // Export buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const finalName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = finalName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }
}
