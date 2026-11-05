// Dựng schema trên database trong DATABASE_URL (Supabase hoặc Postgres bất kỳ): node src/config/setup_db.js
// Chỉ chạy trên database trống; các file 006–012 có câu lệnh xoá/đặt lại dữ liệu cấu hình workflow.
import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';

dotenv.config({ quiet: true });
const { Client } = pkg;
const here = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(here, '../../../database');
const migrationsDir = path.resolve(here, 'migrations');

// Thứ tự dựng schema. Các file 0xx mới của backend nằm trong src/config/migrations, số từ 013 trở đi.
const FILES = [
  'flowise_1.0_baseline.sql',
  '005_flowse_2.0_enterprise_core.sql',
  '006_sprint1_transitions_and_inspections.sql',
  '007_sprint2_notifications_and_throttling.sql',
  '008_seed_default_space_list.sql',
  '009_sprint1_material_approval_and_sla_pause.sql',
  '010_sprint2_downtime_and_mttr.sql',
  '011_sprint2_resolved_evidence.sql',
  '012_persist_asset_health_score_and_snapshots.sql',
];
const newMigrations = () => fs.readdirSync(migrationsDir).filter((f) => /^(0(1[3-9]|[2-9]\d)|[1-9]\d\d)_.*\.sql$/.test(f)).sort();

export const newClient = () => new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

/** Chạy toàn bộ file schema theo thứ tự, mỗi file một transaction. Trả về danh sách file đã chạy. */
export async function applySchema(client) {
  const done = [];
  const files = [...FILES.map((f) => path.join(dbDir, f)), ...newMigrations().map((f) => path.join(migrationsDir, f))];
  for (const file of files) {
    await client.query('BEGIN');
    try {
      await client.query(fs.readFileSync(file, 'utf8'));
      await client.query('COMMIT');
      done.push(path.basename(file));
    } catch (e) {
      await client.query('ROLLBACK');
      throw new Error(`${path.basename(file)}: ${e.message}`);
    }
  }
  return done;
}

/** Chạy lại các migration mới (013+) trên database đang dùng. Mỗi file phải chạy lại được (IF EXISTS / IF NOT EXISTS). */
async function migrate() {
  const client = newClient();
  await client.connect();
  try {
    for (const f of newMigrations()) {
      await client.query(fs.readFileSync(path.join(migrationsDir, f), 'utf8'));
      console.log('✓', f);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  if (process.argv.includes('--migrate')) return migrate();
  const client = newClient();
  await client.connect();
  const { rows } = await client.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'");
  if (rows[0].n > 0 && !process.argv.includes('--force')) {
    console.error(`Database đã có ${rows[0].n} bảng. Dừng để tránh ghi đè (thêm --force nếu chắc chắn).`);
    process.exit(1);
  }
  for (const f of await applySchema(client)) console.log('✓', f);

  // Supabase mở bảng public qua Data API cho khóa anon. Backend nối thẳng bằng user postgres (bỏ qua RLS),
  // nên bật RLS không kèm policy để chặn mọi truy cập qua Data API.
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  for (const { tablename } of tables.rows) await client.query(`ALTER TABLE public."${tablename}" ENABLE ROW LEVEL SECURITY`);
  await client.query('ALTER VIEW public.kanban_tasks SET (security_invoker = true)');
  await client.query('ALTER VIEW public.user_task_summary SET (security_invoker = true)');
  console.log(`✓ RLS bật cho ${tables.rows.length} bảng`);

  // seed_demo.js gắn mọi dữ liệu mẫu vào user 1, nên tạo user này trước
  const users = await client.query('SELECT count(*)::int AS n FROM users');
  if (users.rows[0].n === 0) {
    const password = crypto.randomBytes(9).toString('base64url');
    await client.query(
      'INSERT INTO users (username, name, email, password_hash) VALUES ($1, $2, $3, $4)',
      ['minhanh', 'Nguyễn Minh Anh', 'minhanh@anphat.vn', await bcrypt.hash(password, 10)]
    );
    console.log(`✓ Tài khoản đầu tiên: minhanh@anphat.vn / ${password}`);
  }
  await client.end();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
