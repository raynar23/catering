// PDF generator using jsPDF and jspdf-autotable producing official A4 landscape corporate reports
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatNumber, formatDate, formatDateLong } from "@/lib/format";

export interface PdfReportOptions {
  dari: string;
  sampai: string;
  columns: Array<{ id: string; nama: string; kode: string }>;
  rows: Array<{
    tanggal: string;
    shift_nama: string;
    shift_label: string;
    vendor_nama: string;
    vendor_kode: string;
    items: Record<string, number>;
    total_porsi: number;
  }>;
  summaryTotals: Record<string, number>;
  grandTotal: number;
  perShift: Array<{
    shift_nama: string;
    shift_label: string;
    total_porsi: number;
    persentase: number;
  }>;
  perVendor: Array<{
    vendor_nama: string;
    vendor_kode: string;
    total_porsi: number;
    persentase: number;
  }>;
  catatan?: string;
}

// Generate official A4 landscape PDF report buffer
export async function generatePdfReport(options: PdfReportOptions): Promise<Buffer> {
  const {
    dari,
    sampai,
    columns,
    rows,
    summaryTotals,
    grandTotal,
    perShift,
    perVendor,
    catatan,
  } = options;

  // Initialize jsPDF in A4 Landscape (297mm x 210mm) with compression enabled
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  // 1. Corporate Header Kop with official Pelindo TPS logo
  try {
    const fs = await import("fs");
    const path = await import("path");
    const logoPath = path.join(process.cwd(), "public", "images", "logo-tps-warna.png");
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      doc.addImage(logoBase64, "PNG", pageWidth - marginX - 42, 10, 42, 13.06, undefined, "FAST");
    }
  } catch {
    // Graceful fallback if filesystem read fails
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(17, 117, 187); // Pelindo Primary Blue
  doc.text("PT TERMINAL PETIKEMAS SURABAYA", marginX, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text("GENERAL AFFAIRS - SISTEM PENGELOLAAN DATA CATERING KARYAWAN", marginX, 19.5);
  doc.text("Jl. Tanjung Tembaga No. 1, Tanjung Perak, Surabaya 60165 | www.tps.co.id", marginX, 23.5);

  // Corporate double divider lines
  doc.setDrawColor(17, 117, 187);
  doc.setLineWidth(0.7);
  doc.line(marginX, 26, pageWidth - marginX, 26);

  doc.setDrawColor(210, 215, 225);
  doc.setLineWidth(0.3);
  doc.line(marginX, 27, pageWidth - marginX, 27);

  // 2. Report Document Title & Metadata
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text("LAPORAN REKAPITULASI KEBUTUHAN CATERING KARYAWAN", marginX, 34);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Periode: ${formatDate(dari)} s/d ${formatDate(sampai)}`, marginX, 39);

  const printTimeStr = `Dicetak: ${formatDateLong(new Date())} WIB`;
  doc.text(printTimeStr, pageWidth - marginX - doc.getTextWidth(printTimeStr), 39);

  // 3. Main Daily Matrix Table
  const tableHead = [
    ["Tanggal", "Shift", "Vendor", ...columns.map((c) => c.nama), "Total"],
  ];

  const tableBody = rows.map((r) => [
    formatDate(r.tanggal),
    `${r.shift_nama} (${r.shift_label})`,
    `${r.vendor_nama} (${r.vendor_kode})`,
    ...columns.map((col) => {
      const val = r.items?.[col.id];
      return val && val > 0 ? formatNumber(val) : "-";
    }),
    formatNumber(r.total_porsi),
  ]);

  const tableFoot = [
    [
      "TOTAL KESELURUHAN",
      "",
      "",
      ...columns.map((col) => {
        const val = summaryTotals?.[col.id];
        return val && val > 0 ? formatNumber(val) : "-";
      }),
      formatNumber(grandTotal),
    ],
  ];

  autoTable(doc, {
    startY: 44,
    margin: { left: marginX, right: marginX, bottom: 20 },
    head: tableHead,
    body: tableBody,
    foot: tableFoot,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
      textColor: [40, 40, 40],
      lineColor: [220, 220, 225],
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: [17, 117, 187],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      cellPadding: { top: 2.8, bottom: 2.8, left: 2.5, right: 2.5 },
    },
    footStyles: {
      fillColor: [242, 242, 247],
      textColor: [17, 117, 187],
      fontStyle: "bold",
      cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 22 },
      1: { halign: "left", cellWidth: 26 },
      2: { halign: "left", cellWidth: 34 },
    },
    didParseCell: (data) => {
      // Right-align numeric columns
      if (data.column.index >= 3) {
        data.cell.styles.halign = "right";
      }
    },
  });

  // 4. Summary Tables Section
  const finalY = (doc as any).lastAutoTable?.finalY || 140;
  let summaryStartY = finalY + 10;

  // Add a new page if the bottom margin does not fit summary tables
  if (summaryStartY > pageHeight - 55) {
    doc.addPage();
    summaryStartY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text("RINGKASAN DISTRIBUSI", marginX, summaryStartY - 2);

  // Left: Shift Summary Table
  const shiftTableWidth = 120;
  autoTable(doc, {
    startY: summaryStartY,
    margin: { left: marginX },
    tableWidth: shiftTableWidth,
    head: [["Shift Kerja", "Porsi", "Proporsi (%)"]],
    body: perShift.map((s) => [
      `${s.shift_nama} (${s.shift_label})`,
      formatNumber(s.total_porsi),
      `${s.persentase}%`,
    ]),
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
      textColor: [40, 40, 40],
      valign: "middle",
    },
    headStyles: {
      fillColor: [70, 75, 85],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      cellPadding: { top: 2.6, bottom: 2.6, left: 2.5, right: 2.5 },
    },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
    },
  });

  // Right: Vendor Summary Table
  const vendorStartX = marginX + shiftTableWidth + 10;
  autoTable(doc, {
    startY: summaryStartY,
    margin: { left: vendorStartX },
    tableWidth: 130,
    head: [["Kode", "Nama Vendor", "Porsi", "Proporsi (%)"]],
    body: perVendor.map((v) => [
      v.vendor_kode,
      v.vendor_nama,
      formatNumber(v.total_porsi),
      `${v.persentase}%`,
    ]),
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
      textColor: [40, 40, 40],
      valign: "middle",
    },
    headStyles: {
      fillColor: [70, 75, 85],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      cellPadding: { top: 2.6, bottom: 2.6, left: 2.5, right: 2.5 },
    },
    columnStyles: {
      0: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  // Optional Notes at bottom of document
  if (catatan && catatan.trim()) {
    const afterSummaryY = Math.max(
      (doc as any).lastAutoTable?.finalY || 170,
      summaryStartY + 25
    );
    if (afterSummaryY < pageHeight - 20) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text("Catatan Khusus:", marginX, afterSummaryY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(catatan.trim(), marginX, afterSummaryY + 10);
    }
  }

  // 5. Numbered Page Footers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    const footerText = `Dokumen Resmi PT Terminal Petikemas Surabaya  |  Halaman ${i} dari ${totalPages}`;
    doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: "center" });
  }

  const pdfArrayBuffer = doc.output("arraybuffer");
  return Buffer.from(pdfArrayBuffer);
}
