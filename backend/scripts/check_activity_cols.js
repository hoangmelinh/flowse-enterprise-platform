import con from '../src/config/connect.js';

async function main() {
  const r = await con.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'activity_logs' ORDER BY ordinal_position");
  console.log('--- ACTIVITY_LOGS COLUMNS ---');
  console.table(r.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
