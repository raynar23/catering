// Client-side PDF export utility producing standardized PT Terminal Petikemas Surabaya documents
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfColumn<T> {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "center" | "right";
  format?: (row: T, index: number) => string | number | null | undefined;
}

export interface ExportToPdfOptions<T> {
  filename: string;
  title: string;
  subtitle?: string;
  columns: PdfColumn<T>[];
  data: T[];
  orientation?: "portrait" | "landscape";
  catatan?: string;
}

let cachedClientLogo: string | null = null;

// Retrieve Pelindo TPS color logo in base64 format for browser and test environments
async function getClientLogoBase64(): Promise<string | null> {
  if (cachedClientLogo) return cachedClientLogo;

  // Browser environment using fetch and FileReader
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/images/logo-tps-warna.png");
      if (res.ok) {
        const blob = await res.blob();
        cachedClientLogo = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return cachedClientLogo;
      }
    } catch {
      // Graceful fallback if network fails
    }
  }

  // Node and Vitest environment fallback without bundler warnings
  if (typeof window === "undefined") {
    try {
      const fsModuleName = "fs";
      const pathModuleName = "path";
      const fs = await import(/* @vite-ignore */ fsModuleName);
      const path = await import(/* @vite-ignore */ pathModuleName);
      const logoPath = path.join(process.cwd(), "public", "images", "logo-tps-warna.png");
      if (fs.existsSync(logoPath)) {
        const buf = fs.readFileSync(logoPath);
        cachedClientLogo = `data:image/png;base64,${buf.toString("base64")}`;
        return cachedClientLogo;
      }
    } catch {
      // Ignore fallback errors
    }
  }

  return null;
}

// Generate official PDF document and trigger browser download
export async function exportTableToPdf<T>(options: ExportToPdfOptions<T>): Promise<Uint8Array> {
  const orientation = options.orientation || "landscape";
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  // 1. Embed official Pelindo TPS logo at top right
  const logoBase64 = await getClientLogoBase64();
  if (logoBase64) {
    const logoW = orientation === "landscape" ? 42 : 36;
    const logoH = logoW / 3.216;
    doc.addImage(logoBase64, "PNG", pageWidth - marginX - logoW, 10, logoW, logoH, undefined, "FAST");
  }

  // 2. Corporate Letterhead
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

  // 3. Document Title & Subtitle Metadata
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(options.title.toUpperCase(), marginX, 34);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  if (options.subtitle) {
    doc.text(options.subtitle, marginX, 39);
  }

  const printTimeStr = `Dicetak: ${new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}, ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;
  doc.text(printTimeStr, pageWidth - marginX - doc.getTextWidth(printTimeStr), 39);

  // 4. Render Table with autoTable
  const head = [options.columns.map((c) => c.header)];
  const body = options.data.map((row, idx) =>
    options.columns.map((col) => {
      if (col.format) {
        const res = col.format(row, idx);
        return res !== undefined && res !== null ? String(res) : "-";
      }
      const val = (row as Record<string, unknown>)[col.key];
      return val !== undefined && val !== null ? String(val) : "-";
    })
  );

  const columnStyles: Record<number, { halign?: "left" | "center" | "right" }> = {};
  options.columns.forEach((col, idx) => {
    if (col.align) {
      columnStyles[idx] = { halign: col.align };
    }
  });

  autoTable(doc, {
    startY: 44,
    margin: { left: marginX, right: marginX, bottom: 20 },
    head,
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: { top: 2.8, bottom: 2.8, left: 3, right: 3 },
      textColor: [40, 40, 40],
      lineColor: [225, 228, 235],
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: [17, 117, 187],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: { top: 3.2, bottom: 3.2, left: 3, right: 3 },
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [250, 251, 254],
    },
    columnStyles,
    didParseCell: (data) => {
      const colDef = options.columns[data.column.index];
      if (data.section === "head" && colDef?.align) {
        data.cell.styles.halign = colDef.align;
      }
    },
  });

  // 5. Optional Notes
  if (options.catatan && options.catatan.trim()) {
    const finalY = (doc as any).lastAutoTable?.finalY || 140;
    if (finalY + 20 < pageHeight - 20) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text("Catatan Tambahan:", marginX, finalY + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(options.catatan.trim(), marginX, finalY + 12);
    }
  }

  // 6. Page Footers across all pages
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
  const finalFilename = options.filename.endsWith(".pdf") ? options.filename : `${options.filename}.pdf`;

  // Trigger browser download if running in client window
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const blob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = finalFilename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }

  return new Uint8Array(pdfArrayBuffer);
}
