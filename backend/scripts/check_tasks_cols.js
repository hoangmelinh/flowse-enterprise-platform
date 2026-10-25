import con from '../src/config/connect.js';

async function main() {
  const cols = await con.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position"
  );
  console.log('--- TASKS COLUMNS ---');
  console.table(cols.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
