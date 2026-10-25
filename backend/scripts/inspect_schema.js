import con from '../src/config/connect.js';

async function main() {
  const usersCols = await con.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
  );
  console.log('--- USERS COLUMNS ---');
  console.table(usersCols.rows);

  const roles = await con.query("SELECT * FROM roles");
  console.log('--- ROLES ---');
  console.table(roles.rows);

  const perms = await con.query("SELECT * FROM permissions LIMIT 10");
  console.log('--- PERMISSIONS (Sample) ---');
  console.table(perms.rows);

  const depts = await con.query("SELECT department_id, name, code, manager_id, parent_id FROM departments");
  console.log('--- DEPARTMENTS ---');
  console.table(depts.rows);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
