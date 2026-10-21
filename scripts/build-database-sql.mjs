// scripts/build-database-sql.mjs
// Consolidates migrations and seed into a single executable SQL file: DATABASE_LENGKAP_CATERING.sql

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, join } from "path";

const projectRoot = process.cwd();
const migrationsDir = resolve(projectRoot, "supabase/migrations");
const seedFile = resolve(projectRoot, "supabase/seed.sql");
const outputFile = resolve(projectRoot, "DATABASE_LENGKAP_CATERING.sql");
const supabaseOutputFile = resolve(projectRoot, "supabase/DATABASE_LENGKAP_CATERING.sql");

function buildDatabaseSql() {
  console.log("Building single unified database SQL file...");

  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  let combinedSql = `-- ==============================================================================
-- DATABASE LENGKAP CATERING KARYAWAN PT TERMINAL PETIKEMAS SURABAYA
-- Generated automatically: ${new Date().toISOString()}
-- ==============================================================================

`;

  for (const file of migrationFiles) {
    const filePath = join(migrationsDir, file);
    const content = readFileSync(filePath, "utf-8");
    combinedSql += `-- ------------------------------------------------------------------------------\n`;
    combinedSql += `-- MIGRATION: ${file}\n`;
    combinedSql += `-- ------------------------------------------------------------------------------\n\n`;
    combinedSql += content.trim() + "\n\n";
  }

  if (seedFile) {
    const seedContent = readFileSync(seedFile, "utf-8");
    combinedSql += `-- ------------------------------------------------------------------------------\n`;
    combinedSql += `-- SEED DATA & 29-DAY ROLLING DEMO SCHEDULE\n`;
    combinedSql += `-- ------------------------------------------------------------------------------\n\n`;
    combinedSql += seedContent.trim() + "\n";
  }

  writeFileSync(outputFile, combinedSql, "utf-8");
  writeFileSync(supabaseOutputFile, combinedSql, "utf-8");
  console.log(`Successfully generated:\n- ${outputFile}\n- ${supabaseOutputFile}`);
}

buildDatabaseSql();
