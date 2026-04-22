const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({connectionString: 'postgresql://neondb_owner:npg_cOqQatGeA4C3@ep-empty-wave-aiwbbp7a-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'}); 

pool.query('SELECT amount, payment_date FROM payments').then(res => { 
    fs.writeFileSync('C:/Users/mandi/Documents/motionERP/db_dump.json', JSON.stringify(res.rows, null, 2)); 
    process.exit(0); 
});
