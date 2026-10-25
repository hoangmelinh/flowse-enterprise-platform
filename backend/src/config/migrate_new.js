import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'flowse_enterprise'
  });
  await client.connect();

  const migrationFiles = [
    '006_sprint1_transitions_and_inspections.sql',
    '007_sprint2_notifications_and_throttling.sql',
    '008_seed_default_space_list.sql',
    '009_sprint1_material_approval_and_sla_pause.sql',
    '010_sprint2_downtime_and_mttr.sql',
    '011_sprint2_resolved_evidence.sql',
    '012_persist_asset_health_score_and_snapshots.sql'
  ];

  for (const file of migrationFiles) {
    const fullPath = path.resolve(__dirname, '../../../database', file);
    if (fs.existsSync(fullPath)) {
      console.log(`Running migration: ${file}...`);
      const sql = fs.readFileSync(fullPath, 'utf8');
      try {
        await client.query(sql);
        console.log(`✓ Migration ${file} succeeded.`);
      } catch (err) {
        console.warn(`! Note on ${file}:`, err.message);
      }
    }
  }

  await client.end();
  console.log("All migrations finished.");
}

runMigrations().catch(console.error);
