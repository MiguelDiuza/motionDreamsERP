/**
 * Migration: payments enrichment for agent payment flow.
 * Idempotent. Run: node scripts/migrate_payments.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, '..', '.env.local');
  const line = fs.readFileSync(envPath, 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL'));
  if (!line) throw new Error('DATABASE_URL not found');
  return line.slice(line.indexOf('=') + 1).trim();
}

const pool = new Pool({ connectionString: getDatabaseUrl() });

const SQL = `
ALTER TABLE payments ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS kind VARCHAR(20);            -- 'DEPOSIT' | 'FINAL'
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'CONFIRMED'; -- 'PENDING' | 'CONFIRMED'
ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_ref VARCHAR(255);

-- Existing rows already reduced debt / counted as income -> they are CONFIRMED.
UPDATE payments SET status = 'CONFIRMED' WHERE status IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_external_ref ON payments(external_ref) WHERE external_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_job_id ON payments(job_id);
`;

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(SQL);
    await client.query('COMMIT');
    console.log('Payments migration applied successfully.');
    const counts = await client.query(
      `SELECT status, COUNT(*) c, COALESCE(SUM(amount),0) total FROM payments GROUP BY status`
    );
    console.log('payments by status:', JSON.stringify(counts.rows));
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
