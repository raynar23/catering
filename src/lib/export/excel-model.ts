// Pure domain model builder for corporate Excel catering report spreadsheets

export interface CellStyle {
  font?: {
    name?: string; // Arial
    size?: number;
    bold?: boolean;
    color?: string;
  };
  alignment?: {
    horizontal?: "left" | "center" | "right";
    vertical?: "top" | "middle" | "bottom";
    wrapText?: boolean;
  };
  fill?: {
    type: "pattern";
    pattern: "solid";
    fgColor: string; // hex RRGGBB
  };
  border?: {
    top?: { style: "thin" | "medium" | "double"; color?: string };
    bottom?: { style: "thin" | "medium" | "double"; color?: string };
    left?: { style: "thin" | "medium" | "double"; color?: string };
    right?: { style: "thin" | "medium" | "double"; color?: string };
  };
  numFmt?: string;
}

export interface CellMerge {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface CellData {
  row: number;
  col: number;
  value?: string | number | null;
  formula?: string; // Excel formula (e.g., "SUM(C7:E7)")
  style?: CellStyle;
}

export interface SheetModel {
  name: string;
  cells: CellData[];
  merges: CellMerge[];
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
}

export interface ExcelWorkbookModel {
  sheets: SheetModel[];
}

export interface ExportBagianItem {
  id: string;
  kode: string;
  nama: string;
  kelompok: string;
  urutan: number;
  lokasi_antar?: string | null;
  catatan_antar?: string | null;
}

export interface ExportShiftItem {
  id: string;
  nama: string;
  label: string;
  alias: string;
  urutan_laporan: number;
  batas_tiba: string;
}

export interface ExportVendorItem {
  id: string;
  kode: string;
  nama: string;
}

export interface ExportOrderItem {
  tanggal: string; // YYYY-MM-DD
  shift_id: string;
  bagian_id: string;
  vendor_id?: string;
  jumlah_porsi: number;
}

export interface ExcelBuilderOptions {
  monthPartitions: Array<{
    monthKey: string;
    monthLabel: string;
    dari: string;
    sampai: string;
    year: number;
    month: number;
  }>;
  bagianList: ExportBagianItem[];
  shiftsList: ExportShiftItem[];
  vendorsList: ExportVendorItem[];
  orders: ExportOrderItem[];
  catatan?: string;
}

// Convert 1-based column index to Excel column letter (e.g., 1 -> 'A', 27 -> 'AA')
export function colToLetter(col: number): string {
  let temp = col;
  let letter = "";
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

// Default standard styles with Arial font matching ARCHITECTURE.md specifications
const STYLE_TITLE: CellStyle = {
  font: { name: "Arial", size: 13, bold: true, color: "000000" },
  alignment: { horizontal: "center", vertical: "middle" },
};

const STYLE_SUBTITLE: CellStyle = {
  font: { name: "Arial", size: 10, bold: true, color: "000000" },
  alignment: { horizontal: "center", vertical: "middle" },
};

const STYLE_HEADER: CellStyle = {
  font: { name: "Arial", size: 9, bold: true, color: "000000" },
  alignment: { horizontal: "center", vertical: "middle", wrapText: true },
  fill: { type: "pattern", pattern: "solid", fgColor: "D9E1F2" },
  border: {
    top: { style: "thin", color: "808080" },
    bottom: { style: "thin", color: "808080" },
    left: { style: "thin", color: "808080" },
    right: { style: "thin", color: "808080" },
  },
};

const STYLE_KELOMPOK_HEADER: CellStyle = {
  font: { name: "Arial", size: 9, bold: true, color: "002060" },
  alignment: { horizontal: "left", vertical: "middle" },
  fill: { type: "pattern", pattern: "solid", fgColor: "F2F2F2" },
  border: {
    top: { style: "thin", color: "A6A6A6" },
    bottom: { style: "thin", color: "A6A6A6" },
    left: { style: "thin", color: "A6A6A6" },
    right: { style: "thin", color: "A6A6A6" },
  },
};

const STYLE_DATA_TEXT: CellStyle = {
  font: { name: "Arial", size: 9, color: "000000" },
  alignment: { horizontal: "left", vertical: "middle" },
  border: {
    top: { style: "thin", color: "D9D9D9" },
    bottom: { style: "thin", color: "D9D9D9" },
    left: { style: "thin", color: "D9D9D9" },
    right: { style: "thin", color: "D9D9D9" },
  },
};

const STYLE_DATA_CENTER: CellStyle = {
  font: { name: "Arial", size: 9, color: "000000" },
  alignment: { horizontal: "center", vertical: "middle" },
  border: {
    top: { style: "thin", color: "D9D9D9" },
    bottom: { style: "thin", color: "D9D9D9" },
    left: { style: "thin", color: "D9D9D9" },
    right: { style: "thin", color: "D9D9D9" },
  },
};

const STYLE_DATA_NUM: CellStyle = {
  font: { name: "Arial", size: 9, color: "000000" },
  alignment: { horizontal: "right", vertical: "middle" },
  border: {
    top: { style: "thin", color: "D9D9D9" },
    bottom: { style: "thin", color: "D9D9D9" },
    left: { style: "thin", color: "D9D9D9" },
    right: { style: "thin", color: "D9D9D9" },
  },
};

const STYLE_DATA_NUM_TOTAL: CellStyle = {
  font: { name: "Arial", size: 9, bold: true, color: "000000" },
  alignment: { horizontal: "right", vertical: "middle" },
  fill: { type: "pattern", pattern: "solid", fgColor: "F2F2F2" },
  border: {
    top: { style: "thin", color: "A6A6A6" },
    bottom: { style: "thin", color: "A6A6A6" },
    left: { style: "thin", color: "A6A6A6" },
    right: { style: "thin", color: "A6A6A6" },
  },
};

const STYLE_SUBTOTAL: CellStyle = {
  font: { name: "Arial", size: 9, bold: true, color: "000000" },
  alignment: { horizontal: "right", vertical: "middle" },
  fill: { type: "pattern", pattern: "solid", fgColor: "E7E6E6" },
  border: {
    top: { style: "thin", color: "808080" },
    bottom: { style: "thin", color: "808080" },
    left: { style: "thin", color: "808080" },
    right: { style: "thin", color: "808080" },
  },
};

const STYLE_GRAND_TOTAL: CellStyle = {
  font: { name: "Arial", size: 10, bold: true, color: "000000" },
  alignment: { horizontal: "right", vertical: "middle" },
  fill: { type: "pattern", pattern: "solid", fgColor: "D9E1F2" },
  border: {
    top: { style: "thin", color: "000000" },
    bottom: { style: "double", color: "000000" },
    left: { style: "thin", color: "000000" },
    right: { style: "thin", color: "000000" },
  },
};

// Pure builder converting catering data into an Excel spreadsheet model
export function buildExcelWorkbookModel(options: ExcelBuilderOptions): ExcelWorkbookModel {
  const { monthPartitions, bagianList, shiftsList, vendorsList, orders, catatan } = options;
  const sheets: SheetModel[] = [];

  // Sort shifts according to official report ordering (Shift 3 -> 1, Shift 1 -> 2, Shift 2 -> 3)
  const sortedShifts = [...shiftsList].sort(
    (a, b) => (a.urutan_laporan ?? 0) - (b.urutan_laporan ?? 0)
  );

  // Group departments by 'kelompok' preserving sort order
  const kelompokMap = new Map<string, ExportBagianItem[]>();
  for (const b of bagianList) {
    const k = b.kelompok || "LAINNYA";
    if (!kelompokMap.has(k)) kelompokMap.set(k, []);
    kelompokMap.get(k)!.push(b);
  }

  // Pre-index orders by [YYYY-MM-DD_shiftId_bagianId] -> porsi
  const orderIndex = new Map<string, number>();
  for (const o of orders) {
    const key = `${o.tanggal}_${o.shift_id}_${o.bagian_id}`;
    orderIndex.set(key, (orderIndex.get(key) || 0) + (o.jumlah_porsi || 0));
  }

  // Generate a dedicated sheet for each month segment
  for (const partition of monthPartitions) {
    const sheet = buildMonthSheetModel({
      partition,
      bagianList,
      kelompokMap,
      sortedShifts,
      orderIndex,
      catatan,
    });
    sheets.push(sheet);
  }

  // If reporting spans multiple months, append a consolidated Summary Sheet
  if (monthPartitions.length > 1) {
    const summarySheet = buildSummarySheetModel({
      monthPartitions,
      bagianList,
      sortedShifts,
      vendorsList,
      orders,
    });
    sheets.push(summarySheet);
  }

  return { sheets };
}

interface MonthSheetContext {
  partition: ExcelBuilderOptions["monthPartitions"][0];
  bagianList: ExportBagianItem[];
  kelompokMap: Map<string, ExportBagianItem[]>;
  sortedShifts: ExportShiftItem[];
  orderIndex: Map<string, number>;
  catatan?: string;
}

// Build a single month's sheet partitioned into Day 1-15 and Day 16-End blocks
function buildMonthSheetModel(ctx: MonthSheetContext): SheetModel {
  const { partition, kelompokMap, sortedShifts, orderIndex, catatan } = ctx;
  const cells: CellData[] = [];
  const merges: CellMerge[] = [];
  const colWidths: Record<number, number> = {
    1: 5, // No
    2: 24, // Bagian
  };

  const startDay = parseInt(partition.dari.slice(8, 10), 10);
  const endDay = parseInt(partition.sampai.slice(8, 10), 10);

  // Split month into Block 1 (Day 1-15) and Block 2 (Day 16-End)
  const blocks: Array<{ start: number; end: number; label: string }> = [];
  if (startDay <= 15) {
    blocks.push({
      start: startDay,
      end: Math.min(endDay, 15),
      label: `TANGGAL ${startDay} - ${Math.min(endDay, 15)} ${partition.monthLabel.toUpperCase()}`,
    });
  }
  if (endDay >= 16) {
    blocks.push({
      start: Math.max(startDay, 16),
      end: endDay,
      label: `TANGGAL ${Math.max(startDay, 16)} - ${endDay} ${partition.monthLabel.toUpperCase()}`,
    });
  }

  let currentRow = 1;

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    const totalDays = block.end - block.start + 1;
    const lastDataCol = 2 + totalDays * 3; // Shift sub-columns
    const totalCol = lastDataCol + 1; // Row Total column

    colWidths[totalCol] = 9;

    // 1. Document Title
    cells.push({
      row: currentRow,
      col: 1,
      value: "REKAPITULASI PEMBAGIAN JATAH MAKAN PETUGAS SHIFT",
      style: STYLE_TITLE,
    });
    merges.push({ startRow: currentRow, startCol: 1, endRow: currentRow, endCol: totalCol });
    currentRow++;

    // 2. Period Subtitle
    cells.push({
      row: currentRow,
      col: 1,
      value: `PERIODE ${block.label}`,
      style: STYLE_SUBTITLE,
    });
    merges.push({ startRow: currentRow, startCol: 1, endRow: currentRow, endCol: totalCol });
    currentRow += 2; // Extra breathing line

    // 3. Matrix Headers: Row 1 (Tanggal) & Row 2 (Shift sub-columns)
    const headerRow1 = currentRow;
    const headerRow2 = currentRow + 1;

    // Header Col A: NO
    cells.push({ row: headerRow1, col: 1, value: "NO", style: STYLE_HEADER });
    merges.push({ startRow: headerRow1, startCol: 1, endRow: headerRow2, endCol: 1 });

    // Header Col B: BAGIAN
    cells.push({ row: headerRow1, col: 2, value: "BAGIAN / UNIT KERJA", style: STYLE_HEADER });
    merges.push({ startRow: headerRow1, startCol: 2, endRow: headerRow2, endCol: 2 });

    // Date and Shift Columns
    for (let d = block.start; d <= block.end; d++) {
      const dayOffset = d - block.start;
      const startC = 3 + dayOffset * 3;
      const endC = startC + 2;

      // Merged Date Header
      cells.push({ row: headerRow1, col: startC, value: d, style: STYLE_HEADER });
      merges.push({ startRow: headerRow1, startCol: startC, endRow: headerRow1, endCol: endC });

      // Shift Sub-headers (3, 1, 2)
      sortedShifts.forEach((s, sIdx) => {
        const c = startC + sIdx;
        colWidths[c] = 4.5;
        // Extract shift number identifier (e.g., '3', '1', '2')
        const shiftNum = s.nama.replace(/\D/g, "") || String(sIdx + 1);
        cells.push({ row: headerRow2, col: c, value: shiftNum, style: STYLE_HEADER });
      });
    }

    // Header Total Column
    cells.push({ row: headerRow1, col: totalCol, value: "TOTAL", style: STYLE_HEADER });
    merges.push({ startRow: headerRow1, startCol: totalCol, endRow: headerRow2, endCol: totalCol });

    currentRow += 2;

    // 4. Data Rows Grouped by Kelompok
    let bagianNo = 1;
    const subtotalRows: number[] = [];

    for (const [kelompokName, bList] of kelompokMap.entries()) {
      // Kelompok Section Row
      cells.push({
        row: currentRow,
        col: 1,
        value: kelompokName,
        style: STYLE_KELOMPOK_HEADER,
      });
      merges.push({ startRow: currentRow, startCol: 1, endRow: currentRow, endCol: totalCol });
      currentRow++;

      const kelompokStartRow = currentRow;

      for (const bagian of bList) {
        cells.push({ row: currentRow, col: 1, value: bagianNo++, style: STYLE_DATA_CENTER });
        cells.push({ row: currentRow, col: 2, value: bagian.nama, style: STYLE_DATA_TEXT });

        let rowCachedSum = 0;

        for (let d = block.start; d <= block.end; d++) {
          const dayStr = `${partition.monthKey}-${String(d).padStart(2, "0")}`;
          const dayOffset = d - block.start;
          const startC = 3 + dayOffset * 3;

          sortedShifts.forEach((s, sIdx) => {
            const c = startC + sIdx;
            const key = `${dayStr}_${s.id}_${bagian.id}`;
            const qty = orderIndex.get(key) || 0;
            rowCachedSum += qty;

            cells.push({
              row: currentRow,
              col: c,
              value: qty > 0 ? qty : "-",
              style: STYLE_DATA_NUM,
            });
          });
        }

        // Row Total Formula & Cached Value
        const startLetter = colToLetter(3);
        const endLetter = colToLetter(lastDataCol);
        cells.push({
          row: currentRow,
          col: totalCol,
          value: rowCachedSum,
          formula: `SUM(${startLetter}${currentRow}:${endLetter}${currentRow})`,
          style: STYLE_DATA_NUM_TOTAL,
        });

        currentRow++;
      }

      const kelompokEndRow = currentRow - 1;

      // Kelompok Subtotal Row
      if (kelompokEndRow >= kelompokStartRow) {
        const subtotalRow = currentRow;
        subtotalRows.push(subtotalRow);

        cells.push({
          row: subtotalRow,
          col: 2,
          value: `JUMLAH ${kelompokName}`,
          style: { ...STYLE_SUBTOTAL, alignment: { horizontal: "left", vertical: "middle" } },
        });

        let subtotalCachedSum = 0;

        for (let c = 3; c <= lastDataCol; c++) {
          const cLetter = colToLetter(c);
          let colSum = 0;
          for (let r = kelompokStartRow; r <= kelompokEndRow; r++) {
            const foundCell = cells.find((cell) => cell.row === r && cell.col === c);
            if (typeof foundCell?.value === "number") {
              colSum += foundCell.value;
            }
          }
          subtotalCachedSum += colSum;

          cells.push({
            row: subtotalRow,
            col: c,
            value: colSum > 0 ? colSum : "-",
            formula: `SUM(${cLetter}${kelompokStartRow}:${cLetter}${kelompokEndRow})`,
            style: STYLE_SUBTOTAL,
          });
        }

        const startLetter = colToLetter(3);
        const endLetter = colToLetter(lastDataCol);
        cells.push({
          row: subtotalRow,
          col: totalCol,
          value: subtotalCachedSum,
          formula: `SUM(${startLetter}${subtotalRow}:${endLetter}${subtotalRow})`,
          style: STYLE_SUBTOTAL,
        });

        currentRow++;
      }
    }

    // 5. Grand Total Row
    const grandTotalRow = currentRow;
    cells.push({
      row: grandTotalRow,
      col: 2,
      value: "TOTAL",
      style: { ...STYLE_GRAND_TOTAL, alignment: { horizontal: "left", vertical: "middle" } },
    });

    let grandTotalCached = 0;

    for (let c = 3; c <= lastDataCol; c++) {
      const cLetter = colToLetter(c);
      let colGrandSum = 0;
      for (const subRow of subtotalRows) {
        const foundCell = cells.find((cell) => cell.row === subRow && cell.col === c);
        if (typeof foundCell?.value === "number") colGrandSum += foundCell.value;
      }
      grandTotalCached += colGrandSum;

      const subtotalFormulas = subtotalRows.map((r) => `${cLetter}${r}`).join("+");
      cells.push({
        row: grandTotalRow,
        col: c,
        value: colGrandSum > 0 ? colGrandSum : "-",
        formula: subtotalRows.length > 0 ? subtotalFormulas : `0`,
        style: STYLE_GRAND_TOTAL,
      });
    }

    const startLetter = colToLetter(3);
    const endLetter = colToLetter(lastDataCol);
    cells.push({
      row: grandTotalRow,
      col: totalCol,
      value: grandTotalCached,
      formula: `SUM(${startLetter}${grandTotalRow}:${endLetter}${grandTotalRow})`,
      style: STYLE_GRAND_TOTAL,
    });

    currentRow += 3; // Space before next block or footer
  }

  // 6. Footer Sections (CATATAN & JADWAL PENGIRIMAN)
  cells.push({
    row: currentRow,
    col: 2,
    value: "CATATAN:",
    style: { font: { name: "Arial", size: 9, bold: true } },
  });
  currentRow++;

  const notesText = catatan?.trim() || "Porsi catering disesuaikan dengan kehadiran operasional petugas shift.";
  cells.push({
    row: currentRow,
    col: 2,
    value: notesText,
    style: { font: { name: "Arial", size: 9, color: "333333" } },
  });
  currentRow += 2;

  cells.push({
    row: currentRow,
    col: 2,
    value: "JADWAL PENGIRIMAN CATERING:",
    style: { font: { name: "Arial", size: 9, bold: true } },
  });
  currentRow++;

  sortedShifts.forEach((s) => {
    cells.push({
      row: currentRow,
      col: 2,
      value: `- ${s.nama} (${s.label}): Batas jam tiba makanan pukul ${s.batas_tiba.slice(0, 5)} WIB`,
      style: { font: { name: "Arial", size: 9, color: "333333" } },
    });
    currentRow++;
  });

  return {
    name: partition.monthLabel.slice(0, 31),
    cells,
    merges,
    colWidths,
  };
}

interface SummarySheetContext {
  monthPartitions: ExcelBuilderOptions["monthPartitions"];
  bagianList: ExportBagianItem[];
  sortedShifts: ExportShiftItem[];
  vendorsList: ExportVendorItem[];
  orders: ExportOrderItem[];
}

// Build consolidated multi-month overview sheet
function buildSummarySheetModel(ctx: SummarySheetContext): SheetModel {
  const { monthPartitions, bagianList, sortedShifts, vendorsList, orders } = ctx;
  const cells: CellData[] = [];
  const merges: CellMerge[] = [];
  const colWidths: Record<number, number> = {
    1: 6,
    2: 28,
    3: 16,
    4: 16,
  };

  let row = 1;

  cells.push({
    row,
    col: 1,
    value: "RINGKASAN REKAPITULASI PEMBAGIAN JATAH MAKAN",
    style: STYLE_TITLE,
  });
  merges.push({ startRow: row, startCol: 1, endRow: row, endCol: 4 });
  row += 2;

  // 1. Ringkasan per Bulan
  cells.push({
    row,
    col: 1,
    value: "1. REKAPITULASI BULANAN",
    style: { font: { name: "Arial", size: 10, bold: true } },
  });
  row++;

  cells.push({ row, col: 1, value: "NO", style: STYLE_HEADER });
  cells.push({ row, col: 2, value: "BULAN", style: STYLE_HEADER });
  cells.push({ row, col: 3, value: "TOTAL PORSI", style: STYLE_HEADER });
  row++;

  let bNo = 1;
  let totalBulanAll = 0;
  for (const part of monthPartitions) {
    const monthlyTotal = orders
      .filter((o) => o.tanggal >= part.dari && o.tanggal <= part.sampai)
      .reduce((sum, o) => sum + (o.jumlah_porsi || 0), 0);
    totalBulanAll += monthlyTotal;

    cells.push({ row, col: 1, value: bNo++, style: STYLE_DATA_CENTER });
    cells.push({ row, col: 2, value: part.monthLabel, style: STYLE_DATA_TEXT });
    cells.push({ row, col: 3, value: monthlyTotal, style: STYLE_DATA_NUM });
    row++;
  }

  cells.push({ row, col: 2, value: "TOTAL", style: STYLE_GRAND_TOTAL });
  cells.push({ row, col: 3, value: totalBulanAll, style: STYLE_GRAND_TOTAL });
  row += 3;

  // 2. Ringkasan per Shift
  cells.push({
    row,
    col: 1,
    value: "2. REKAPITULASI PER SHIFT",
    style: { font: { name: "Arial", size: 10, bold: true } },
  });
  row++;

  cells.push({ row, col: 1, value: "NO", style: STYLE_HEADER });
  cells.push({ row, col: 2, value: "SHIFT KERJA", style: STYLE_HEADER });
  cells.push({ row, col: 3, value: "TOTAL PORSI", style: STYLE_HEADER });
  row++;

  let sNo = 1;
  let totalShiftAll = 0;
  for (const s of sortedShifts) {
    const shiftTotal = orders
      .filter((o) => o.shift_id === s.id)
      .reduce((sum, o) => sum + (o.jumlah_porsi || 0), 0);
    totalShiftAll += shiftTotal;

    cells.push({ row, col: 1, value: sNo++, style: STYLE_DATA_CENTER });
    cells.push({ row, col: 2, value: `${s.nama} (${s.label})`, style: STYLE_DATA_TEXT });
    cells.push({ row, col: 3, value: shiftTotal, style: STYLE_DATA_NUM });
    row++;
  }

  cells.push({ row, col: 2, value: "TOTAL", style: STYLE_GRAND_TOTAL });
  cells.push({ row, col: 3, value: totalShiftAll, style: STYLE_GRAND_TOTAL });
  row += 3;

  // 3. Ringkasan per Vendor
  cells.push({
    row,
    col: 1,
    value: "3. REKAPITULASI PER VENDOR",
    style: { font: { name: "Arial", size: 10, bold: true } },
  });
  row++;

  cells.push({ row, col: 1, value: "KODE", style: STYLE_HEADER });
  cells.push({ row, col: 2, value: "NAMA VENDOR", style: STYLE_HEADER });
  cells.push({ row, col: 3, value: "TOTAL PORSI", style: STYLE_HEADER });
  row++;

  let totalVendorAll = 0;
  for (const v of vendorsList) {
    const vTotal = orders
      .filter((o) => o.vendor_id === v.id)
      .reduce((sum, o) => sum + (o.jumlah_porsi || 0), 0);
    totalVendorAll += vTotal;

    cells.push({ row, col: 1, value: v.kode, style: STYLE_DATA_CENTER });
    cells.push({ row, col: 2, value: v.nama, style: STYLE_DATA_TEXT });
    cells.push({ row, col: 3, value: vTotal, style: STYLE_DATA_NUM });
    row++;
  }

  cells.push({ row, col: 2, value: "TOTAL", style: STYLE_GRAND_TOTAL });
  cells.push({ row, col: 3, value: totalVendorAll, style: STYLE_GRAND_TOTAL });
  row += 3;

  // 4. Ringkasan per Bagian
  cells.push({
    row,
    col: 1,
    value: "4. REKAPITULASI PER BAGIAN",
    style: { font: { name: "Arial", size: 10, bold: true } },
  });
  row++;

  cells.push({ row, col: 1, value: "NO", style: STYLE_HEADER });
  cells.push({ row, col: 2, value: "NAMA BAGIAN", style: STYLE_HEADER });
  cells.push({ row, col: 3, value: "TOTAL PORSI", style: STYLE_HEADER });
  row++;

  let bBagNo = 1;
  let totalBagianAll = 0;
  for (const b of bagianList) {
    const bTotal = orders
      .filter((o) => o.bagian_id === b.id)
      .reduce((sum, o) => sum + (o.jumlah_porsi || 0), 0);
    totalBagianAll += bTotal;

    cells.push({ row, col: 1, value: bBagNo++, style: STYLE_DATA_CENTER });
    cells.push({ row, col: 2, value: b.nama, style: STYLE_DATA_TEXT });
    cells.push({ row, col: 3, value: bTotal, style: STYLE_DATA_NUM });
    row++;
  }

  cells.push({ row, col: 2, value: "TOTAL", style: STYLE_GRAND_TOTAL });
  cells.push({ row, col: 3, value: totalBagianAll, style: STYLE_GRAND_TOTAL });

  return {
    name: "Ringkasan",
    cells,
    merges,
    colWidths,
  };
}
