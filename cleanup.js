const { Pool } = require('pg');
const pool = new Pool({connectionString: 'postgresql://neondb_owner:npg_cOqQatGeA4C3@ep-empty-wave-aiwbbp7a-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'}); 

async function clean() {
    await pool.query('DELETE FROM payments WHERE client_id NOT IN (SELECT id FROM clients)');
    await pool.query('DELETE FROM jobs WHERE client_id NOT IN (SELECT id FROM clients)');
    console.log("Orphans removed");
    process.exit(0);
}
clean();
