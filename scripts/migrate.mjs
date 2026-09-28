#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const ROOT = new URL('..', import.meta.url).pathname;

function loadEnvLocal() {
  const file = `${ROOT}.env.local`;
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}

function splitStatements(sqlText) {
  const withoutComments = sqlText
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return withoutComments
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  loadEnvLocal();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL: cópiala en .env.local (ver .env.example).');
    process.exit(1);
  }

  const sql = neon(url);
  const file = new URL('../db/schema.sql', import.meta.url);
  const statements = splitStatements(readFileSync(file, 'utf8'));

  for (const [index, statement] of statements.entries()) {
    try {
      await sql.query(statement);
    } catch (error) {
      console.error(`Fallo la sentencia ${index + 1}/${statements.length}:`);
      console.error(statement);
      console.error(error?.message ?? error);
      process.exit(1);
    }
  }

  const rows = await sql.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name",
  );
  console.log(`Esquema aplicado (${statements.length} sentencias). Tablas: ${rows.map((r) => r.table_name).join(', ')}`);
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
