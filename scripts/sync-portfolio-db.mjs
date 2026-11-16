#!/usr/bin/env node
// Refreshes the portfolio database (pulpi-portfolio) with the current real
// catalog from production (pulpi-production) - read-only from production's
// point of view, this only ever runs SELECT against it.
//
// Only copies the 5 tables needed to browse the storefront: products,
// categories, collections, app_settings, size_formats. Every other table
// (orders, contact/newsletter/birthday subscribers, discounts, rate limits,
// inventory history, etc.) holds real customer PII or business data and is
// deliberately never touched by this script - those stay empty in the
// portfolio database forever, isolated in its own separate D1 instance.
//
// NSFW categories and products are filtered out here (not just deleted
// once) so every future re-sync keeps excluding them automatically - the
// portfolio site never shows adult content, regardless of what's live on
// the real store.
//
// Usage: node scripts/sync-portfolio-db.mjs

import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SOURCE_DB = "pulpi-production";
const TARGET_DB = "pulpi-portfolio";
const TABLES = ["app_settings", "size_formats", "categories", "collections", "products"];

// npx is npx.cmd on Windows, which can only run through a shell - but
// execFileSync's array-argument quoting isn't honored by cmd.exe the way it
// is for a direct spawn, so each arg has to be quoted by hand and joined
// into one command string instead of passed as an array.
function quoteArg(arg) {
  return `"${String(arg).replaceAll('"', '\\"')}"`;
}

function runWrangler(args) {
  const command = `npx wrangler ${args.map(quoteArg).join(" ")}`;
  return execSync(command, { encoding: "utf8", maxBuffer: 1024 * 1024 * 64 });
}

function fetchRows(table) {
  // wrangler's --file mode is a bulk-import path that never returns row
  // data (even with --json) - reading rows back requires --command.
  const output = runWrangler(["d1", "execute", SOURCE_DB, "--remote", "--json", "--command", `SELECT * FROM ${table}`]);
  const parsed = JSON.parse(output);
  return parsed[0].results;
}

function filterNsfw(table, rows) {
  if (table !== "categories" && table !== "products") return rows;
  return rows.filter((row) => row.is_nsfw !== 1);
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function buildInsertStatements(table, rows) {
  if (rows.length === 0) return `DELETE FROM ${table};`;
  const columns = Object.keys(rows[0]);
  const inserts = rows.map(
    (row) => `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map((c) => sqlLiteral(row[c])).join(",")});`,
  );
  return [`DELETE FROM ${table};`, ...inserts].join("\n");
}

console.log(`Syncing ${TABLES.join(", ")} from ${SOURCE_DB} -> ${TARGET_DB} ...`);

const statements = [];
for (const table of TABLES) {
  const allRows = fetchRows(table);
  const rows = filterNsfw(table, allRows);
  const skipped = allRows.length - rows.length;
  console.log(`  ${table}: ${rows.length} row(s)${skipped ? ` (${skipped} NSFW excluded)` : ""}`);
  statements.push(buildInsertStatements(table, rows));
}

const dir = mkdtempSync(join(tmpdir(), "portfolio-sync-"));
const filePath = join(dir, "sync.sql");
writeFileSync(filePath, statements.join("\n\n"));

console.log("Applying to portfolio database...");
console.log(runWrangler(["d1", "execute", TARGET_DB, "--remote", `--file=${filePath}`]));

rmSync(dir, { recursive: true, force: true });
console.log("Done.");
