const fs = require('fs');
const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n');
envConfig.forEach(line => {
    const match = line.match(/^([^=:]+?)=([^#]+)/);
    if (match) process.env[match[1].trim()] = match[2].trim();
});
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/motion_erp',
});

async function migrate() {
    try {
        console.log('Starting migration...');
        
        await pool.query(`
            ALTER TABLE jobs ADD COLUMN IF NOT EXISTS progress_level INT DEFAULT 0;
            ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_minutes INT DEFAULT 0;
            ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_date DATE;
            ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_time VARCHAR(10);
        `);
        console.log('Added columns to jobs table.');

        try {
            await pool.query(`ALTER TABLE jobs ADD PRIMARY KEY (id);`);
            console.log('Added PRIMARY KEY to jobs(id).');
        } catch(e) {
            console.log('PRIMARY KEY on jobs(id) probably already exists.');
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS time_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
                estimated_minutes INT DEFAULT 0,
                actual_minutes INT DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('Created time_logs table.');

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
