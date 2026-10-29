import { describe, it, expect, vi } from "vitest";
import { exportToExcel } from "./client-excel";

describe("client-excel utility", () => {
  it("formats workbook and handles browser download safely", async () => {
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURLMock = vi.fn();
    const clickMock = vi.fn();

    const mockAnchor = {
      set href(val: string) {},
      set download(val: string) {},
      click: clickMock,
    };

    const mockDocument = {
      createElement: vi.fn().mockReturnValue(mockAnchor),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };

    const mockWindow = {
      URL: {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      },
    };

    vi.stubGlobal("window", mockWindow);
    vi.stubGlobal("document", mockDocument);

    const sampleData = [
      { id: "1", kode: "V001", nama: "Aisya Catering", porsi: 100 },
      { id: "2", kode: "V002", nama: "Nurina Catering", porsi: 150 },
    ];

    await exportToExcel({
      filename: "test_export.xlsx",
      title: "Data Rekanan Vendor",
      subtitle: "PT Terminal Petikemas Surabaya",
      columns: [
        { header: "Kode", key: "kode", width: 10 },
        { header: "Nama Vendor", key: "nama", width: 25 },
        { header: "Porsi", key: "porsi", width: 12, align: "right" },
      ],
      data: sampleData,
    });

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
