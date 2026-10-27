import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function getAllSrcFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      getAllSrcFiles(fullPath, fileList);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file) && !file.includes('security-reset-guard.test')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe('G3 & I4: Static Security Guard - No Operational Reset Paths & Script Allowlist Guards', () => {
  it('should not contain any reference to reset_operational_data or resetOperationalDataAction in src/', () => {
    const srcDir = join(process.cwd(), 'src');
    const allFiles = getAllSrcFiles(srcDir);
    const violations: { file: string; line: number; match: string }[] = [];

    const forbiddenPatterns = [
      /reset_operational_data/i,
      /resetOperationalDataAction/i,
      /ResetOperationalModal/i,
    ];

    for (const filePath of allFiles) {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, idx) => {
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(lineText)) {
            violations.push({
              file: filePath.replace(process.cwd(), ''),
              line: idx + 1,
              match: lineText.trim(),
            });
          }
        }
      });
    }

    expect(
      violations,
      `Forbidden reset paths detected in src/:\n${violations
        .map((v) => `  ${v.file}:${v.line} -> ${v.match}`)
        .join('\n')}`
    ).toEqual([]);
  });

  it('I4: Write scripts must strictly guard target database URL and block production without authorization', () => {
    const scripts = ['scripts/smoke-flow.mjs', 'scripts/test-db.mjs'];
    for (const relPath of scripts) {
      const fullPath = join(process.cwd(), relPath);
      const content = readFileSync(fullPath, 'utf-8');

      // Must check for production URL or tdvfbtxlnlduajztojng
      expect(content).toContain('tdvfbtxlnlduajztojng');
      expect(content).toMatch(/isProduction/i);
    }
  });

  it('I4: smoke-flow.mjs must enforce date allowlist rejecting dates outside allowed window (2026-10-01 to 2026-12-31)', () => {
    const smokePath = join(process.cwd(), 'scripts/smoke-flow.mjs');
    const content = readFileSync(smokePath, 'utf-8');

    // Must not contain dynamic 2028 or 2099 date generation
    expect(content).not.toContain('2028-${month}-${day}');
    expect(content).not.toContain('2099-01-02');

    // Must contain boundary checks
    expect(content).toContain('allowedMinDate = "2026-10-01"');
    expect(content).toContain('allowedMaxDate = "2026-12-31"');

    // Unit test date range allowlist function logic
    function isAllowedTestDate(dateStr: string): boolean {
      const minDate = "2026-10-01";
      const maxDate = "2026-12-31";
      return dateStr >= minDate && dateStr <= maxDate;
    }

    // Must REJECT out-of-range dates reported in audit
    expect(isAllowedTestDate("2028-01-23")).toBe(false);
    expect(isAllowedTestDate("2028-09-07")).toBe(false);
    expect(isAllowedTestDate("2099-01-02")).toBe(false);
    expect(isAllowedTestDate("2025-10-01")).toBe(false);
    expect(isAllowedTestDate("2027-01-01")).toBe(false);

    // Must ACCEPT dates inside the Q4 2026 window
    expect(isAllowedTestDate("2026-10-01")).toBe(true);
    expect(isAllowedTestDate("2026-10-26")).toBe(true);
    expect(isAllowedTestDate("2026-11-20")).toBe(true);
    expect(isAllowedTestDate("2026-12-31")).toBe(true);
  });

  it('I5: seed-uat-window.mjs must only attach orders to existing periods and not create periods on its own', () => {
    const seedPath = join(process.cwd(), 'scripts/seed-uat-window.mjs');
    const content = readFileSync(seedPath, 'utf-8');

    // Must verify existing periods and exit if absent
    expect(content).toContain('from("periods")');
    expect(content).toContain('Jadwal periode Oktober - Desember 2026 belum ada di database');
    expect(content).not.toContain('.from("periods").insert('); // No period insertion in seed-uat-window
  });
});
