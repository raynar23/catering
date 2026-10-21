// Build consolidated DATABASE_LENGKAP_CATERING.sql from migrations and seed

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

  let combinedSql = `-- Unified schema and seed for Catering TPS\n\n`;

  for (const file of migrationFiles) {
    const filePath = join(migrationsDir, file);
    const content = readFileSync(filePath, "utf-8");
    combinedSql += `-- Migration: ${file}\n`;
    combinedSql += content.trim() + "\n\n";
  }

  if (seedFile) {
    const seedContent = readFileSync(seedFile, "utf-8");
    combinedSql += `-- Seed data\n`;
    combinedSql += seedContent.trim() + "\n";
  }

  writeFileSync(outputFile, combinedSql, "utf-8");
  writeFileSync(supabaseOutputFile, combinedSql, "utf-8");
  console.log(`Successfully generated:\n- ${outputFile}\n- ${supabaseOutputFile}`);
}

buildDatabaseSql();
