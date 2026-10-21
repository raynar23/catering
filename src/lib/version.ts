// Centralized system version metadata reader from package manifest
import packageJson from "../../package.json";

export interface SystemInfo {
  name: string;
  version: string;
  company: string;
  label: string;
}

// Retrieve the current semantic version of the application
export function getSystemVersion(): string {
  return packageJson.version || "0.1.0";
}

// Retrieve formal application identity metadata for corporate headers and footers
export function getSystemInfo(): SystemInfo {
  const version = getSystemVersion();
  const name = "Sistem Pengelolaan Data Catering Karyawan";
  const company = "PT Terminal Petikemas Surabaya";
  const label = `${name} v${version} • ${company}`;

  return {
    name,
    version,
    company,
    label,
  };
}
