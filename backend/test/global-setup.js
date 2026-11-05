// Chạy một lần trước mọi file test: dựng lại schema flowse_test và nạp dữ liệu test.
// Không bao giờ chạm schema public (dữ liệu thật).
import bcrypt from 'bcrypt';
import { newClient, applySchema } from '../src/config/setup_db.js';
import { SCHEMA, PASSWORD, U, WS } from './fixtures.js';

export async function globalSetup() {
  const c = newClient();
  await c.connect();
  try {
    await c.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await c.query(`CREATE SCHEMA ${SCHEMA}`);
    await c.query(`SET search_path TO ${SCHEMA}, extensions`);
    await applySchema(c);

    const hash = await bcrypt.hash(PASSWORD, 4);
    for (const u of Object.values(U)) {
      await c.query('INSERT INTO users (user_id, username, name, email, password_hash) VALUES ($1, $2, $3, $4, $5)', [u.id, u.username, u.name, u.email, hash]);
    }
    await c.query("SELECT setval(pg_get_serial_sequence('users', 'user_id'), 100)");
    for (const w of Object.values(WS)) {
      await c.query('INSERT INTO workspaces (workspace_id, name, slug, created_by) VALUES ($1, $2, $3, $4)', [w.id, w.name, w.slug, w.owner]);
      for (const [userId, role] of w.members) {
        await c.query('INSERT INTO workspace_members (workspace_id, user_id, role_id) VALUES ($1, $2, (SELECT role_id FROM roles WHERE role_name = $3))', [w.id, userId, role]);
      }
    }
    await c.query("SELECT setval(pg_get_serial_sequence('workspaces', 'workspace_id'), 100)");
  } finally {
    await c.end();
  }
}
