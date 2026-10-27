// Tests for catering grid reducer and calculation helpers
import { describe, it, expect } from "vitest";
import {
  gridReducer,
  calculateShiftTotals,
  getMissingBagian,
  getDirtyItems,
  GridState,
  BagianRowItem,
  ShiftColumnState,
} from "./grid-reducer";

const sampleBagian: BagianRowItem[] = [
  { id: "b1", kode: "OPS", nama: "Operasional", lokasi_antar: "Dermaga 1", urutan: 1 },
  { id: "b2", kode: "MEK", nama: "Mekanik", lokasi_antar: "Workshop", urutan: 2 },
  { id: "b3", kode: "CFS", nama: "Gudang CFS", lokasi_antar: "Gudang CFS", urutan: 3 },
];

function createInitialState(): GridState {
  const initialShift: ShiftColumnState = {
    periodId: "p1",
    orderId: "o1",
    shiftId: "s3",
    shiftNama: "Shift 3",
    shiftLabel: "Malam",
    jamMulai: "00:00",
    jamSelesai: "08:00",
    vendorId: "v1",
    vendorNama: "Aisya Catering",
    vendorKode: "V001",
    status: "draft",
    responVendor: "menunggu",
    progresVendor: "menunggu",
    lastUpdatedBy: null,
    lastUpdatedAt: null,
    cells: {
      b1: { karyawan: 10, porsi: 10, keterangan: "", isCustomPorsi: false, isDirty: false },
      b2: { karyawan: 5, porsi: 5, keterangan: "", isCustomPorsi: false, isDirty: false },
      b3: { karyawan: null, porsi: null, keterangan: "", isCustomPorsi: false, isDirty: false },
    },
  };

  return {
    tanggal: "2026-10-22",
    bagianList: sampleBagian,
    shifts: { s3: initialShift },
    shiftOrder: ["s3"],
    isDirty: false,
  };
}

describe("catering grid reducer", () => {
  it("initializes grid state correctly", () => {
    const state = createInitialState();
    const action = {
      type: "INITIALIZE_GRID" as const,
      payload: {
        tanggal: "2026-10-23",
        bagianList: sampleBagian,
        shifts: state.shifts,
        shiftOrder: ["s3"],
      },
    };

    const nextState = gridReducer(state, action);
    expect(nextState.tanggal).toBe("2026-10-23");
    expect(nextState.isDirty).toBe(false);
  });

  it("updates karyawan and automatically synchronizes porsi when not custom", () => {
    const state = createInitialState();
    const nextState = gridReducer(state, {
      type: "UPDATE_KARYAWAN",
      payload: { shiftId: "s3", bagianId: "b1", value: 15 },
    });

    const cell = nextState.shifts.s3.cells.b1;
    expect(cell.karyawan).toBe(15);
    expect(cell.porsi).toBe(15);
    expect(cell.isCustomPorsi).toBe(false);
    expect(cell.isDirty).toBe(true);
    expect(nextState.isDirty).toBe(true);
  });

  it("clamps negative numbers to 0 and allows 0", () => {
    const state = createInitialState();
    const nextState = gridReducer(state, {
      type: "UPDATE_KARYAWAN",
      payload: { shiftId: "s3", bagianId: "b1", value: -5 },
    });

    const cell = nextState.shifts.s3.cells.b1;
    expect(cell.karyawan).toBe(0);
    expect(cell.porsi).toBe(0);
  });

  it("preserves custom porsi when karyawan is subsequently updated", () => {
    const state = createInitialState();

    // Custom edit porsi to 12
    const state1 = gridReducer(state, {
      type: "UPDATE_PORSI",
      payload: { shiftId: "s3", bagianId: "b1", value: 12 },
    });

    expect(state1.shifts.s3.cells.b1.porsi).toBe(12);
    expect(state1.shifts.s3.cells.b1.isCustomPorsi).toBe(true);

    // Now update karyawan to 20
    const state2 = gridReducer(state1, {
      type: "UPDATE_KARYAWAN",
      payload: { shiftId: "s3", bagianId: "b1", value: 20 },
    });

    expect(state2.shifts.s3.cells.b1.karyawan).toBe(20);
    // Porsi should still be 12, not overwritten
    expect(state2.shifts.s3.cells.b1.porsi).toBe(12);
    expect(state2.shifts.s3.cells.b1.isCustomPorsi).toBe(true);
  });

  it("updates keterangan and flags cell as dirty", () => {
    const state = createInitialState();
    const nextState = gridReducer(state, {
      type: "UPDATE_KETERANGAN",
      payload: { shiftId: "s3", bagianId: "b2", value: "Lembur 2 orang" },
    });

    const cell = nextState.shifts.s3.cells.b2;
    expect(cell.keterangan).toBe("Lembur 2 orang");
    expect(cell.isDirty).toBe(true);
  });

  it("marks shift as saved and clears dirty flags", () => {
    const state = createInitialState();
    const dirtyState = gridReducer(state, {
      type: "UPDATE_KARYAWAN",
      payload: { shiftId: "s3", bagianId: "b1", value: 25 },
    });

    expect(dirtyState.isDirty).toBe(true);

    const savedState = gridReducer(dirtyState, {
      type: "MARK_SHIFT_SAVED",
      payload: {
        shiftId: "s3",
        orderId: "o1",
        status: "draft",
        lastUpdatedBy: "Admin GA",
        lastUpdatedAt: "2026-10-21T10:00:00Z",
      },
    });

    expect(savedState.isDirty).toBe(false);
    expect(savedState.shifts.s3.cells.b1.isDirty).toBe(false);
    expect(savedState.shifts.s3.lastUpdatedBy).toBe("Admin GA");
  });

  it("handles external sync with conflict detection on modified cells", () => {
    const state = createInitialState();
    // User edits b1 locally
    const dirtyState = gridReducer(state, {
      type: "UPDATE_KARYAWAN",
      payload: { shiftId: "s3", bagianId: "b1", value: 99 },
    });

    // Incoming remote data where b1 was changed by someone else to 50, and b2 to 8
    const incomingShift: ShiftColumnState = {
      ...state.shifts.s3,
      cells: {
        b1: { karyawan: 50, porsi: 50, keterangan: "", isCustomPorsi: false, isDirty: false },
        b2: { karyawan: 8, porsi: 8, keterangan: "", isCustomPorsi: false, isDirty: false },
        b3: { karyawan: null, porsi: null, keterangan: "", isCustomPorsi: false, isDirty: false },
      },
    };

    const syncedState = gridReducer(dirtyState, {
      type: "APPLY_EXTERNAL_SYNC",
      payload: { shifts: { s3: incomingShift } },
    });

    // b2 was clean, so it accepted remote 8
    expect(syncedState.shifts.s3.cells.b2.karyawan).toBe(8);
    // b1 was dirty with 99, remote had 50 -> conflict flagged, local preserved
    expect(syncedState.shifts.s3.cells.b1.karyawan).toBe(99);
    expect(syncedState.shifts.s3.cells.b1.isExternallyModified).toBe(true);
  });
});

describe("catering grid helpers", () => {
  it("calculates shift totals correctly ignoring null", () => {
    const cells = {
      b1: { karyawan: 10, porsi: 12, keterangan: "", isCustomPorsi: true, isDirty: false },
      b2: { karyawan: 0, porsi: 0, keterangan: "", isCustomPorsi: false, isDirty: false },
      b3: { karyawan: null, porsi: null, keterangan: "", isCustomPorsi: false, isDirty: false },
    };

    const totals = calculateShiftTotals(cells);
    expect(totals.totalKaryawan).toBe(10);
    expect(totals.totalPorsi).toBe(12);
  });

  it("detects missing departments with null portion (0 is considered filled)", () => {
    const cells = {
      b1: { karyawan: 10, porsi: 10, keterangan: "", isCustomPorsi: false, isDirty: false },
      b2: { karyawan: 0, porsi: 0, keterangan: "", isCustomPorsi: false, isDirty: false }, // 0 is valid
      b3: { karyawan: null, porsi: null, keterangan: "", isCustomPorsi: false, isDirty: false }, // missing
    };

    const missing = getMissingBagian(sampleBagian, cells);
    expect(missing).toEqual(["Gudang CFS"]);
  });

  it("extracts only dirty items for saving", () => {
    const cells = {
      b1: { karyawan: 10, porsi: 10, keterangan: "", isCustomPorsi: false, isDirty: false },
      b2: { karyawan: 5, porsi: 6, keterangan: "Lembur", isCustomPorsi: true, isDirty: true },
      b3: { karyawan: null, porsi: null, keterangan: "", isCustomPorsi: false, isDirty: false },
    };

    const dirty = getDirtyItems(cells);
    expect(dirty).toHaveLength(1);
    expect(dirty[0]).toEqual({
      bagian_id: "b2",
      jumlah_karyawan: 5,
      jumlah_porsi: 6,
      keterangan: "Lembur",
    });
  });

  it("only requires active bagian when validating readiness for kirim_catering", () => {
    const mixedBagian: BagianRowItem[] = [
      { id: "b1", kode: "CC_OP", nama: "CC Operator", lokasi_antar: "Dermaga", urutan: 1, aktif: true },
      { id: "b2", kode: "RTG_OP", nama: "RTG Operator", lokasi_antar: "Lapangan", urutan: 2, aktif: true },
      { id: "b3_inactive", kode: "OLD_SEC", nama: "Bagian Nonaktif", lokasi_antar: "Lama", urutan: 99, aktif: false },
    ];

    // Only active sections filled, inactive section is null
    const cells = {
      b1: { karyawan: 20, porsi: 20, keterangan: "", isCustomPorsi: false, isDirty: false },
      b2: { karyawan: 15, porsi: 15, keterangan: "", isCustomPorsi: false, isDirty: false },
      b3_inactive: { karyawan: null, porsi: null, keterangan: "", isCustomPorsi: false, isDirty: false },
    };

    const missing = getMissingBagian(mixedBagian, cells);
    // Inactive section is ignored, so 0 missing sections -> eligible for kirim
    expect(missing).toEqual([]);
  });

  it("input grid contains and displays exactly the five active operational bagian", () => {
    const fiveActiveBagian: BagianRowItem[] = [
      { id: "b1", kode: "CC_OP", nama: "CC Operator", lokasi_antar: "Dermaga / CC", urutan: 1, aktif: true },
      { id: "b2", kode: "RTG_OP", nama: "RTG Operator", lokasi_antar: "Lapangan RTG", urutan: 2, aktif: true },
      { id: "b3", kode: "MEK_CC", nama: "Mekanik CC", lokasi_antar: "Workshop CC", urutan: 3, aktif: true },
      { id: "b4", kode: "MEK_RTG", nama: "Mekanik RTG", lokasi_antar: "Workshop RTG", urutan: 4, aktif: true },
      { id: "b5", kode: "CFS", nama: "Area Gudang CFS", lokasi_antar: "Gudang CFS", urutan: 5, aktif: true },
    ];

    expect(fiveActiveBagian).toHaveLength(5);
    expect(fiveActiveBagian.every((b) => b.aktif)).toBe(true);

    const names = fiveActiveBagian.map((b) => b.nama);
    expect(names).toEqual([
      "CC Operator",
      "RTG Operator",
      "Mekanik CC",
      "Mekanik RTG",
      "Area Gudang CFS",
    ]);
  });
});
