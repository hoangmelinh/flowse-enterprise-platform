import con from '../src/config/connect.js';
const r = await con.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workflow_states' ORDER BY ordinal_position");
console.log(r.rows);
process.exit(0);
