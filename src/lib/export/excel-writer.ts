// ExcelJS serializer converting abstract ExcelWorkbookModel into a binary spreadsheet buffer
import ExcelJS from "exceljs";
import { ExcelWorkbookModel } from "./excel-model";

// Generate binary Excel .xlsx buffer from pure ExcelWorkbookModel
export async function writeExcelWorkbook(model: ExcelWorkbookModel): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PT Terminal Petikemas Surabaya";
  workbook.lastModifiedBy = "General Affairs TPS";
  workbook.created = new Date();
  workbook.modified = new Date();

  for (const sheetModel of model.sheets) {
    const worksheet = workbook.addWorksheet(sheetModel.name, {
      views: [{ showGridLines: true }],
    });

    // Apply column widths
    if (sheetModel.colWidths) {
      for (const [colIdx, width] of Object.entries(sheetModel.colWidths)) {
        worksheet.getColumn(Number(colIdx)).width = width;
      }
    }

    // Apply row heights
    if (sheetModel.rowHeights) {
      for (const [rowIdx, height] of Object.entries(sheetModel.rowHeights)) {
        worksheet.getRow(Number(rowIdx)).height = height;
      }
    }

    // Apply cell data, formulas, and formatting
    for (const cellData of sheetModel.cells) {
      const cell = worksheet.getCell(cellData.row, cellData.col);

      if (cellData.formula) {
        cell.value = {
          formula: cellData.formula,
          result: cellData.value !== undefined ? (cellData.value as any) : undefined,
        };
      } else {
        cell.value = cellData.value !== undefined ? (cellData.value as any) : "";
      }

      if (cellData.style) {
        // Font (Default Arial)
        if (cellData.style.font) {
          cell.font = {
            name: cellData.style.font.name || "Arial",
            size: cellData.style.font.size || 9,
            bold: cellData.style.font.bold,
            color: cellData.style.font.color ? { argb: "FF" + cellData.style.font.color } : undefined,
          };
        }

        // Alignment
        if (cellData.style.alignment) {
          cell.alignment = {
            horizontal: cellData.style.alignment.horizontal,
            vertical: cellData.style.alignment.vertical,
            wrapText: cellData.style.alignment.wrapText,
          };
        }

        // Fill background
        if (cellData.style.fill?.fgColor) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF" + cellData.style.fill.fgColor },
          };
        }

        // Cell Borders
        if (cellData.style.border) {
          const b = cellData.style.border;
          cell.border = {
            top: b.top
              ? { style: b.top.style, color: b.top.color ? { argb: "FF" + b.top.color } : undefined }
              : undefined,
            bottom: b.bottom
              ? {
                  style: b.bottom.style,
                  color: b.bottom.color ? { argb: "FF" + b.bottom.color } : undefined,
                }
              : undefined,
            left: b.left
              ? { style: b.left.style, color: b.left.color ? { argb: "FF" + b.left.color } : undefined }
              : undefined,
            right: b.right
              ? {
                  style: b.right.style,
                  color: b.right.color ? { argb: "FF" + b.right.color } : undefined,
                }
              : undefined,
          };
        }
      }
    }

    // Apply merged cell regions
    for (const merge of sheetModel.merges) {
      worksheet.mergeCells(merge.startRow, merge.startCol, merge.endRow, merge.endCol);
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
