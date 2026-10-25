import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function init() {
  console.log("Connecting to postgres to ensure database exists...");
  const adminClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'postgres'
  });
  await adminClient.connect();

  const checkDb = await adminClient.query(
    "SELECT 1 FROM pg_database WHERE datname = 'flowse_enterprise'"
  );

  if (checkDb.rows.length === 0) {
    console.log("Creating database flowse_enterprise...");
    await adminClient.query("CREATE DATABASE flowse_enterprise;");
    console.log("Database flowse_enterprise created.");
  } else {
    console.log("Database flowse_enterprise already exists.");
  }
  await adminClient.end();

  console.log("Connecting to flowse_enterprise to run migrations...");
  const dbClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'flowse_enterprise'
  });
  await dbClient.connect();

  const baselineSqlPath = path.resolve(__dirname, '../../../database/flowise_1.0_baseline.sql');
  const enterpriseSqlPath = path.resolve(__dirname, '../../../database/005_flowse_2.0_enterprise_core.sql');

  console.log("Running baseline migration:", baselineSqlPath);
  const baselineSql = fs.readFileSync(baselineSqlPath, 'utf8');
  await dbClient.query(baselineSql);
  console.log("Baseline migration completed.");

  console.log("Running Flowse 2.0 Enterprise core migration:", enterpriseSqlPath);
  const enterpriseSql = fs.readFileSync(enterpriseSqlPath, 'utf8');
  await dbClient.query(enterpriseSql);
  console.log("Enterprise core migration completed.");

  // Check some tables
  const tables = await dbClient.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log("Tables created (" + tables.rows.length + "):", tables.rows.map(t => t.table_name).join(', '));

  await dbClient.end();
  console.log("All DB initialization finished successfully!");
}

init().catch(err => {
  console.error("Initialization error:", err);
  process.exit(1);
});
