import { query } from '../dist/src/config/database.js';

const r = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
r.rows.forEach(row => console.log(row.table_name));
process.exit(0);
