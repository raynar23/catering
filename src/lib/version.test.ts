// Unit tests for system version reader
import { describe, it, expect } from "vitest";
import { getSystemVersion, getSystemInfo } from "./version";

describe("getSystemVersion", () => {
  it("returns semantic version from package.json", () => {
    const version = getSystemVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(version).toBe("1.0.0");
  });
});

describe("getSystemInfo", () => {
  it("returns complete corporate system label", () => {
    const info = getSystemInfo();
    expect(info.name).toBe("Sistem Pengelolaan Data Catering Karyawan");
    expect(info.company).toBe("PT Terminal Petikemas Surabaya");
    expect(info.label).toContain("v1.0.0");
    expect(info.label).toContain("PT Terminal Petikemas Surabaya");
  });
});
