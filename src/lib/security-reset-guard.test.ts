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

describe('G3: Static Security Guard - No Operational Reset Paths in Source Code', () => {
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
});
