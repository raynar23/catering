// Pure reducer and state operations for the 3-shift catering input matrix

export interface CellValue {
  itemId?: string | null;
  karyawan: number | null;
  porsi: number | null;
  keterangan: string;
  isCustomPorsi: boolean;
  isDirty: boolean;
  isExternallyModified?: boolean;
  hasPendingRevision?: boolean;
}

export interface ShiftColumnState {
  periodId: string | null;
  orderId: string | null;
  shiftId: string;
  shiftNama: string;
  shiftLabel: string;
  jamMulai: string;
  jamSelesai: string;
  vendorId: string | null;
  vendorNama: string | null;
  vendorKode: string | null;
  status: string;
  responVendor: string;
  progresVendor: string;
  lastUpdatedBy: string | null;
  lastUpdatedAt: string | null;
  cells: Record<string, CellValue>;
}

export interface BagianRowItem {
  id: string;
  kode: string | null;
  nama: string;
  lokasi_antar: string | null;
  urutan: number;
}

export interface GridState {
  tanggal: string;
  bagianList: BagianRowItem[];
  shifts: Record<string, ShiftColumnState>;
  shiftOrder: string[];
  isDirty: boolean;
}

export type GridAction =
  | {
      type: "INITIALIZE_GRID";
      payload: {
        tanggal: string;
        bagianList: BagianRowItem[];
        shifts: Record<string, ShiftColumnState>;
        shiftOrder: string[];
      };
    }
  | {
      type: "UPDATE_KARYAWAN";
      payload: {
        shiftId: string;
        bagianId: string;
        value: number | null;
      };
    }
  | {
      type: "UPDATE_PORSI";
      payload: {
        shiftId: string;
        bagianId: string;
        value: number | null;
      };
    }
  | {
      type: "UPDATE_KETERANGAN";
      payload: {
        shiftId: string;
        bagianId: string;
        value: string;
      };
    }
  | {
      type: "MARK_SHIFT_SAVED";
      payload: {
        shiftId: string;
        orderId: string;
        status: string;
        lastUpdatedBy: string | null;
        lastUpdatedAt: string | null;
      };
    }
  | {
      type: "APPLY_EXTERNAL_SYNC";
      payload: {
        shifts: Record<string, ShiftColumnState>;
      };
    };

// Calculate sum of employees and portions for a shift
export function calculateShiftTotals(cells: Record<string, CellValue>): {
  totalKaryawan: number;
  totalPorsi: number;
} {
  let totalKaryawan = 0;
  let totalPorsi = 0;

  for (const cell of Object.values(cells)) {
    if (cell.karyawan !== null && cell.karyawan >= 0) {
      totalKaryawan += cell.karyawan;
    }
    if (cell.porsi !== null && cell.porsi >= 0) {
      totalPorsi += cell.porsi;
    }
  }

  return { totalKaryawan, totalPorsi };
}

// Find departments that have not been filled (null portion)
export function getMissingBagian(
  bagianList: BagianRowItem[],
  cells: Record<string, CellValue>
): string[] {
  const missing: string[] = [];

  for (const b of bagianList) {
    const cell = cells[b.id];
    if (!cell || cell.porsi === null) {
      missing.push(b.nama);
    }
  }

  return missing;
}

// Extract only dirty modified items for a shift to prevent overwriting other users
export function getDirtyItems(cells: Record<string, CellValue>): {
  bagian_id: string;
  jumlah_karyawan: number;
  jumlah_porsi: number;
  keterangan: string;
}[] {
  const dirtyItems: {
    bagian_id: string;
    jumlah_karyawan: number;
    jumlah_porsi: number;
    keterangan: string;
  }[] = [];

  for (const [bagianId, cell] of Object.entries(cells)) {
    if (cell.isDirty) {
      const karyawan = cell.karyawan !== null ? cell.karyawan : 0;
      const porsi = cell.porsi !== null ? cell.porsi : karyawan;
      dirtyItems.push({
        bagian_id: bagianId,
        jumlah_karyawan: karyawan,
        jumlah_porsi: porsi,
        keterangan: cell.keterangan || "",
      });
    }
  }

  return dirtyItems;
}

export function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case "INITIALIZE_GRID": {
      return {
        tanggal: action.payload.tanggal,
        bagianList: action.payload.bagianList,
        shifts: action.payload.shifts,
        shiftOrder: action.payload.shiftOrder,
        isDirty: false,
      };
    }

    case "UPDATE_KARYAWAN": {
      const { shiftId, bagianId, value } = action.payload;
      const shift = state.shifts[shiftId];
      if (!shift) return state;

      const currentCell = shift.cells[bagianId] ?? {
        karyawan: null,
        porsi: null,
        keterangan: "",
        isCustomPorsi: false,
        isDirty: false,
      };

      const clampedVal = value !== null ? Math.max(0, Math.floor(value)) : null;
      // Portion follows employee count unless user customized it
      const nextPorsi = currentCell.isCustomPorsi
        ? currentCell.porsi
        : clampedVal;

      const updatedCell: CellValue = {
        ...currentCell,
        karyawan: clampedVal,
        porsi: nextPorsi,
        isDirty: true,
      };

      return {
        ...state,
        isDirty: true,
        shifts: {
          ...state.shifts,
          [shiftId]: {
            ...shift,
            cells: {
              ...shift.cells,
              [bagianId]: updatedCell,
            },
          },
        },
      };
    }

    case "UPDATE_PORSI": {
      const { shiftId, bagianId, value } = action.payload;
      const shift = state.shifts[shiftId];
      if (!shift) return state;

      const currentCell = shift.cells[bagianId] ?? {
        karyawan: null,
        porsi: null,
        keterangan: "",
        isCustomPorsi: false,
        isDirty: false,
      };

      const clampedVal = value !== null ? Math.max(0, Math.floor(value)) : null;

      const updatedCell: CellValue = {
        ...currentCell,
        porsi: clampedVal,
        isCustomPorsi: true,
        isDirty: true,
      };

      return {
        ...state,
        isDirty: true,
        shifts: {
          ...state.shifts,
          [shiftId]: {
            ...shift,
            cells: {
              ...shift.cells,
              [bagianId]: updatedCell,
            },
          },
        },
      };
    }

    case "UPDATE_KETERANGAN": {
      const { shiftId, bagianId, value } = action.payload;
      const shift = state.shifts[shiftId];
      if (!shift) return state;

      const currentCell = shift.cells[bagianId] ?? {
        karyawan: null,
        porsi: null,
        keterangan: "",
        isCustomPorsi: false,
        isDirty: false,
      };

      const updatedCell: CellValue = {
        ...currentCell,
        keterangan: value,
        isDirty: true,
      };

      return {
        ...state,
        isDirty: true,
        shifts: {
          ...state.shifts,
          [shiftId]: {
            ...shift,
            cells: {
              ...shift.cells,
              [bagianId]: updatedCell,
            },
          },
        },
      };
    }

    case "MARK_SHIFT_SAVED": {
      const { shiftId, orderId, status, lastUpdatedBy, lastUpdatedAt } = action.payload;
      const shift = state.shifts[shiftId];
      if (!shift) return state;

      const cleanCells: Record<string, CellValue> = {};
      for (const [bId, cell] of Object.entries(shift.cells)) {
        cleanCells[bId] = {
          ...cell,
          isDirty: false,
          isExternallyModified: false,
        };
      }

      const updatedShifts = {
        ...state.shifts,
        [shiftId]: {
          ...shift,
          orderId,
          status,
          lastUpdatedBy,
          lastUpdatedAt,
          cells: cleanCells,
        },
      };

      const anyDirty = Object.values(updatedShifts).some((s) =>
        Object.values(s.cells).some((c) => c.isDirty)
      );

      return {
        ...state,
        isDirty: anyDirty,
        shifts: updatedShifts,
      };
    }

    case "APPLY_EXTERNAL_SYNC": {
      const incomingShifts = action.payload.shifts;
      const updatedShifts = { ...state.shifts };

      for (const [shiftId, incShift] of Object.entries(incomingShifts)) {
        const curShift = state.shifts[shiftId];
        if (!curShift) {
          updatedShifts[shiftId] = incShift;
          continue;
        }

        const mergedCells: Record<string, CellValue> = { ...curShift.cells };
        for (const [bId, incCell] of Object.entries(incShift.cells)) {
          const curCell = curShift.cells[bId];
          // If local cell was clean, adopt incoming value
          if (!curCell || !curCell.isDirty) {
            mergedCells[bId] = incCell;
          } else if (
            curCell.karyawan !== incCell.karyawan ||
            curCell.porsi !== incCell.porsi
          ) {
            // Local was dirty and remote changed differently -> flag external conflict
            mergedCells[bId] = {
              ...curCell,
              isExternallyModified: true,
            };
          }
        }

        updatedShifts[shiftId] = {
          ...incShift,
          cells: mergedCells,
        };
      }

      return {
        ...state,
        shifts: updatedShifts,
      };
    }

    default:
      return state;
  }
}
