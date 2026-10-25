import con from '../src/config/connect.js';

async function main() {
  const wsCols = await con.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workflow_states' ORDER BY ordinal_position"
  );
  console.log('--- WORKFLOW_STATES COLUMNS ---');
  console.table(wsCols.rows);

  const wtCols = await con.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workflow_transitions' ORDER BY ordinal_position"
  );
  console.log('--- WORKFLOW_TRANSITIONS COLUMNS ---');
  console.table(wtCols.rows);

  const states = await con.query("SELECT * FROM workflow_states ORDER BY workflow_id, position");
  console.log('--- WORKFLOW STATES DATA ---');
  console.table(states.rows);

  const trans = await con.query("SELECT * FROM workflow_transitions");
  console.log('--- WORKFLOW TRANSITIONS DATA ---');
  console.table(trans.rows);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
