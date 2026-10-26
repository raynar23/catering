import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

describe("H5 / G5: Static Security Guard - No Tracked Secrets or Demo Passwords", () => {
  const rootDir = process.cwd();

  // Get all files tracked by git
  const trackedFiles = execSync("git ls-files", { encoding: "utf-8", cwd: rootDir })
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  it("should not contain literal demo passwords in any tracked files", () => {
    // Encoded to prevent self-matching in the test file itself
    const forbiddenPasswords = [
      Buffer.from("Z2F0cHMyMDI2", "base64").toString("utf-8"),
      Buffer.from("dmVuZG9ydHBzMjAyNg==", "base64").toString("utf-8"),
      Buffer.from("YWRtaW4yZ2F0cHMyMDI2", "base64").toString("utf-8"),
      Buffer.from("dmVuZG9yaWJ1dHBzMjAyNg==", "base64").toString("utf-8"),
    ];

    const violations: { file: string; line: number; password: string }[] = [];

    // File extensions to scan
    const scannableExtensions = new Set([
      ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".sql", ".md", ".json", ".yml", ".yaml", ".env"
    ]);

    for (const relPath of trackedFiles) {
      if (relPath === "src/lib/security-secrets-guard.test.ts") continue;
      const ext = path.extname(relPath).toLowerCase();
      if (!scannableExtensions.has(ext)) continue;

      const fullPath = path.join(rootDir, relPath);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pass of forbiddenPasswords) {
          if (line.includes(pass)) {
            violations.push({ file: relPath, line: i + 1, password: pass });
          }
        }
      }
    }

    if (violations.length > 0) {
      console.error("Detected forbidden literal demo passwords:", violations);
    }
    expect(violations, `Forbidden demo passwords found in tracked files: ${JSON.stringify(violations)}`).toEqual([]);
  });

  it("should not contain long JWT tokens (eyJ...) in tracked source/script/config files", () => {
    const jwtPattern = /eyJ[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{25,}/;
    const violations: { file: string; line: number }[] = [];

    for (const relPath of trackedFiles) {
      if (relPath === "src/lib/security-secrets-guard.test.ts") continue;
      if (relPath.endsWith("package-lock.json")) continue; // lockfile contains sha hashes

      const ext = path.extname(relPath).toLowerCase();
      if (![".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".sql", ".sh"].includes(ext)) continue;

      const fullPath = path.join(rootDir, relPath);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (jwtPattern.test(lines[i])) {
          violations.push({ file: relPath, line: i + 1 });
        }
      }
    }

    expect(violations, `Long JWT token patterns found in tracked files: ${JSON.stringify(violations)}`).toEqual([]);
  });

  it("should not contain populated SUPABASE_SERVICE_ROLE_KEY values in tracked files", () => {
    const serviceKeyAssignPattern = /SUPABASE_SERVICE_ROLE_KEY=["']?([a-zA-Z0-9_\-\.]{20,})["']?/;
    const violations: { file: string; line: number }[] = [];

    for (const relPath of trackedFiles) {
      if (relPath === "src/lib/security-secrets-guard.test.ts") continue;
      const fullPath = path.join(rootDir, relPath);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(serviceKeyAssignPattern);
        if (match) {
          const val = match[1];
          // Allow explicit placeholders
          const isPlaceholder = val.includes("placeholder") || 
            val.includes("service-role-key") || 
            val.includes("<staging-service-role-key>") ||
            val.includes("xxx") ||
            val === "";
          if (!isPlaceholder) {
            violations.push({ file: relPath, line: i + 1 });
          }
        }
      }
    }

    expect(violations, `Populated SUPABASE_SERVICE_ROLE_KEY found in tracked files: ${JSON.stringify(violations)}`).toEqual([]);
  });
});
