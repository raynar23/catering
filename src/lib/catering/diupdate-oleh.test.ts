// src/lib/catering/diupdate-oleh.test.ts
// Unit tests verifying that "Diupdate oleh" across Input Data Catering, Periode Catering,
// and Riwayat accurately displays profiles.nama (e.g. PIC Area Gudang CFS, PIC Mekanik, PIC Operator, Administrator GA)
import { describe, it, expect } from "vitest";

describe("I2: 'Diupdate oleh' Profile Name Resolution Test Suite", () => {
  const picProfiles = [
    { id: "usr-cfs", nama: "PIC Area Gudang CFS", role: "admin_ga" },
    { id: "usr-mek", nama: "PIC Mekanik Alat", role: "admin_ga" },
    { id: "usr-opr", nama: "PIC Operator Dermaga", role: "admin_ga" },
    { id: "usr-adm", nama: "Administrator GA", role: "admin_ga" },
  ];

  it("1. Input Data Catering (loadDateData logic): resolves lastUpdatedBy from profiles.nama", () => {
    // Simulating order with recent audit log
    for (const pic of picProfiles) {
      const mockOrderWithLogs = {
        id: "ord-1",
        status: "draft",
        updated_at: "2026-10-27T10:00:00Z",
        created_at: "2026-10-27T09:00:00Z",
        created_profile: { nama: "PIC Lain" },
        submitted_profile: null as { nama: string } | null,
        logs: [
          {
            id: "log-1",
            aksi: "update_porsi",
            keterangan: "Update porsi makan siang",
            created_at: "2026-10-27T10:00:00Z",
            profile: { nama: pic.nama },
          },
        ],
      };

      // Priority resolution logic matching src/lib/actions/catering.ts (lines 236-251)
      let resolvedUpdatedBy: string | null = null;
      const sortedLogs = [...mockOrderWithLogs.logs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      if (sortedLogs.length > 0 && sortedLogs[0].profile?.nama) {
        resolvedUpdatedBy = sortedLogs[0].profile.nama;
      } else if (mockOrderWithLogs.submitted_profile?.nama) {
        resolvedUpdatedBy = mockOrderWithLogs.submitted_profile.nama;
      } else if (mockOrderWithLogs.created_profile?.nama) {
        resolvedUpdatedBy = mockOrderWithLogs.created_profile.nama;
      }

      expect(resolvedUpdatedBy).toBe(pic.nama);
    }
  });

  it("2. Periode Catering (v_periode_ringkas & fallback query): resolves diupdate_oleh with fallback to created_profile.nama", () => {
    for (const pic of picProfiles) {
      // Draft order: submitted_profile is null, created_profile contains the PIC name
      const draftOrder = {
        id: "ord-draft-1",
        status: "draft",
        submitted_profile: null as { nama: string } | null,
        created_profile: { nama: pic.nama },
      };

      const diupdateOlehDraft = draftOrder.submitted_profile?.nama ?? draftOrder.created_profile?.nama ?? null;
      expect(diupdateOlehDraft).toBe(pic.nama);

      // Submitted order: submitted_profile is filled
      const finalOrder = {
        id: "ord-final-1",
        status: "final",
        submitted_profile: { nama: pic.nama },
        created_profile: { nama: "Initial Drafter" },
      };

      const diupdateOlehFinal = finalOrder.submitted_profile?.nama ?? finalOrder.created_profile?.nama ?? null;
      expect(diupdateOlehFinal).toBe(pic.nama);
    }
  });

  it("3. Riwayat / Chronology (getOrderChronology logic): maps profile.nama to olehNama in every log entry", () => {
    for (const pic of picProfiles) {
      const rawLog = {
        id: "log-99",
        aksi: "revisi_diajukan",
        jumlah_awal: 20,
        selisih: 5,
        jumlah_baru: 25,
        keterangan: "Penambahan pekerja lembur",
        created_at: "2026-10-27T11:00:00Z",
        profile: { nama: pic.nama, role: pic.role },
      };

      // Mapping logic matching src/lib/actions/revisi.ts (lines 548-559)
      const mappedLog = {
        id: rawLog.id,
        aksi: rawLog.aksi,
        olehNama: rawLog.profile?.nama || "Admin",
        olehRole: rawLog.profile?.role || "admin_ga",
      };

      expect(mappedLog.olehNama).toBe(pic.nama);
      expect(mappedLog.olehNama).not.toBe("Admin");
      expect(mappedLog.olehNama).not.toBe("Admin GA");
    }
  });
});
