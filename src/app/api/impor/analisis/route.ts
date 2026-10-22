// Privileged server route handler for smart document parsing and analysis
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateMagicNumber } from "@/lib/import/extract/magic";
import { XlsxExtractor } from "@/lib/import/extract/xlsx";
import { DocxExtractor } from "@/lib/import/extract/docx";
import { PdfExtractor, PdfNeedsOcrError } from "@/lib/import/extract/pdf";
import { convertOcrTextToTable } from "@/lib/import/extract/ocr";
import { detectDocumentType } from "@/lib/import/detect";
import { parseJadwal } from "@/lib/import/parsers/jadwal";
import { parseVendor } from "@/lib/import/parsers/vendor";
import { parseBagian } from "@/lib/import/parsers/bagian";
import { calculateImportSummary } from "@/lib/import/validate";
import { AnalysisResult, DocumentType, ImportEngine, ParsedRow, RawTableData } from "@/lib/import/types";

// Maximum 10 MB file size
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Simple in-memory rate limiter per user (max 10 requests/minute)
const userRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = userRateLimits.get(userId);

  if (!entry || now > entry.resetAt) {
    userRateLimits.set(userId, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }

  if (entry.count >= 10) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Verify caller is an active Admin GA
async function verifyAdmin(req: NextRequest) {
  const adminClient = createAdminClient();
  let callerUserId: string | null = null;

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const { data: tokenData } = await adminClient.auth.getUser(token);
    if (tokenData?.user) callerUserId = tokenData.user.id;
  }

  if (!callerUserId) {
    const serverSupabase = await createClient();
    const {
      data: { user: cookieUser },
    } = await serverSupabase.auth.getUser();
    if (cookieUser) callerUserId = cookieUser.id;
  }

  if (!callerUserId) {
    return {
      authorized: false,
      status: 401,
      error: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan login kembali.",
      caller: null,
    };
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, username, nama, role, aktif")
    .eq("id", callerUserId)
    .single();

  if (!profile || profile.role !== "admin_ga" || !profile.aktif) {
    return {
      authorized: false,
      status: 403,
      error: "Hanya Admin GA aktif yang memiliki izin untuk menganalisis berkas impor.",
      caller: null,
    };
  }

  return { authorized: true, status: 200, error: null, caller: profile };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.authorized || !auth.caller) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    if (!checkRateLimit(auth.caller.id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Terlalu banyak permintaan analisis berkas. Harap tunggu 1 menit sebelum mencoba kembali.",
        },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const forceType = (formData.get("forceType") as DocumentType) || "otomatis";
    const ocrText = formData.get("ocrText") as string | null;
    const requestedEngine = (formData.get("engine") as ImportEngine) || "aturan";

    if (!file && !ocrText) {
      return NextResponse.json(
        { success: false, error: "Berkas tidak ditemukan dalam permintaan unggah." },
        { status: 400 }
      );
    }

    const filename = file?.name || "ocr_scan.txt";
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    let buffer: Buffer = Buffer.alloc(0);
    let fileSize = 0;

    if (file) {
      fileSize = file.size;
      if (fileSize > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: "Ukuran berkas melebihi batas maksimal 10 MB." },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);

      // Validate magic number signature
      const isValidMagic = validateMagicNumber(buffer, ext);
      if (!isValidMagic && ext !== "csv") {
        return NextResponse.json(
          {
            success: false,
            error: "Format berkas tidak valid atau isi berkas tidak cocok dengan ekstensinya.",
          },
          { status: 400 }
        );
      }
    }

    let tables: RawTableData[] = [];
    let engineUsed: ImportEngine = requestedEngine;

    if (ocrText) {
      tables = [convertOcrTextToTable(ocrText)];
      engineUsed = "ocr";
    } else if (ext === "xlsx" || ext === "csv" || ext === "xls") {
      const xlsxExtractor = new XlsxExtractor();
      tables = await xlsxExtractor.extract(buffer, filename);
    } else if (ext === "docx" || ext === "doc") {
      const docxExtractor = new DocxExtractor();
      tables = await docxExtractor.extract(buffer, filename);
    } else if (ext === "pdf") {
      const pdfExtractor = new PdfExtractor();
      try {
        tables = await pdfExtractor.extract(buffer, filename);
      } catch (pdfErr) {
        if (pdfErr instanceof PdfNeedsOcrError) {
          return NextResponse.json(
            {
              success: false,
              needsOcr: true,
              error: "Dokumen PDF berupa pindaian (tanpa lapisan teks). Memerlukan pemindaian OCR.",
            },
            { status: 422 }
          );
        }
        throw pdfErr;
      }
    } else {
      return NextResponse.json(
        { success: false, error: `Ekstensi berkas '.${ext}' tidak didukung untuk ekstraksi teks.` },
        { status: 400 }
      );
    }

    // Detect document type
    const detected = detectDocumentType(tables, {
      filename,
      forceType,
    });

    const adminClient = createAdminClient();

    // Fetch master records from DB for matching
    const [vendorsRes, shiftsRes, bagiansRes] = await Promise.all([
      adminClient.from("vendors").select("id, nama, kode"),
      adminClient.from("shifts").select("id, nama, label, alias"),
      adminClient.from("bagian").select("id, nama, kode, kelompok"),
    ]);

    const knownVendors = vendorsRes.data || [];
    const knownShifts = shiftsRes.data || [];
    const knownBagian = bagiansRes.data || [];

    let parsedRows: ParsedRow[] = [];

    if (detected.jenis === "jadwal") {
      parsedRows = parseJadwal(tables, { knownVendors, knownShifts });
    } else if (detected.jenis === "vendor") {
      parsedRows = parseVendor(tables, { knownVendors });
    } else if (detected.jenis === "bagian") {
      parsedRows = parseBagian(tables, { knownBagian });
    } else {
      // Default to jadwal parser
      parsedRows = parseJadwal(tables, { knownVendors, knownShifts });
    }

    // If engine was OCR, mark all rows as perlu_cek as mandated by PRD
    if (engineUsed === "ocr") {
      for (const row of parsedRows) {
        if (row.status !== "error") {
          row.status = "perlu_cek";
          row.alasan = (row.alasan ? row.alasan + "; " : "") + "Hasil ekstraksi OCR (wajib verifikasi visual)";
        }
      }
    }

    const summary = calculateImportSummary(parsedRows);

    // Generate unique batch number: IMP-YYYYMMDD-XXXX
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const nomorBatch = `IMP-${nowStr}-${randomSuffix}`;

    // Save parsed result to import_batches in draft status
    const { data: insertedBatch, error: insertErr } = await adminClient
      .from("import_batches")
      .insert({
        nomor_batch: nomorBatch,
        nama_file: filename,
        tipe_file: ext || "unknown",
        ukuran_bytes: fileSize,
        status: "draft",
        total_baris: parsedRows.length,
        data_parsed: parsedRows,
        diimpor_oleh: auth.caller.id,
        jenis_dokumen: detected.jenis,
        mesin: engineUsed,
        ringkasan: summary,
      })
      .select("id")
      .single();

    if (insertErr) {
      return NextResponse.json(
        {
          success: false,
          error: `Gagal menyimpan draf analisis impor ke basis data: ${insertErr.message}`,
        },
        { status: 500 }
      );
    }

    const result: AnalysisResult = {
      batchId: insertedBatch?.id,
      nomorBatch,
      namaFile: filename,
      tipeFile: ext,
      ukuranBytes: fileSize,
      jenisDokumen: detected.jenis,
      mesin: engineUsed,
      keyakinan: detected.keyakinan,
      ringkasan: summary,
      rows: parsedRows,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Terjadi kesalahan saat memproses berkas: ${err?.message || "Kesalahan internal"}`,
      },
      { status: 500 }
    );
  }
}
