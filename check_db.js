const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_cOqQatGeA4C3@ep-empty-wave-aiwbbp7a-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

async function main() {
    console.log("Fetching payments...");
    const res = await pool.query("SELECT * FROM payments ORDER BY payment_date DESC");
    for (const row of res.rows) {
        console.log(`id: ${row.id}, amount: ${row.amount}, payment_date: ${row.payment_date}, local: ${new Date(row.payment_date).toLocaleString('es-CO')}`);
    }
    console.log("Finished.");
    process.exit(0);
}

main();
