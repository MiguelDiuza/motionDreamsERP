/**
 * Migration: schedule + team assignment + agent integration.
 * Idempotent. Run with: node scripts/migrate_horario.js
 * Reads DATABASE_URL from .env.local (or process.env).
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
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Team members (source of truth for assignable people)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'DESIGNER', -- 'CEO' | 'DESIGNER'
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed (idempotent by name)
INSERT INTO team_members (name, role)
SELECT 'CEO', 'CEO' WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE name = 'CEO');
INSERT INTO team_members (name, role)
SELECT 'Diseñador 1', 'DESIGNER' WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE name = 'Diseñador 1');
INSERT INTO team_members (name, role)
SELECT 'Diseñador 2', 'DESIGNER' WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE name = 'Diseñador 2');

-- 2. jobs: new columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS actual_minutes INT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'ERP';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_ref VARCHAR(255);

-- Unique index for idempotency (allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external_ref ON jobs(external_ref) WHERE external_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON jobs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_at ON jobs(scheduled_at);

-- 3. Migrate existing scheduled_date + scheduled_time into scheduled_at (America/Bogota).
--    Default time 09:00 when scheduled_time is missing/invalid. Only fill rows not yet migrated.
UPDATE jobs
SET scheduled_at = (
    (scheduled_date::text || ' ' ||
     CASE WHEN scheduled_time ~ '^[0-9]{1,2}:[0-9]{2}$' THEN scheduled_time ELSE '09:00' END || ':00'
    )::timestamp AT TIME ZONE 'America/Bogota'
)
WHERE scheduled_date IS NOT NULL AND scheduled_at IS NULL;

-- 4. Drop obsolete agenda table (replaced by jobs as single source of truth)
DROP TABLE IF EXISTS agenda;
`;

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(SQL);
    await client.query('COMMIT');
    console.log('Migration applied successfully.');

    const tm = await client.query('SELECT id, name, role FROM team_members ORDER BY role DESC, name');
    console.log('team_members:');
    tm.rows.forEach((r) => console.log(`  ${r.role.padEnd(8)} ${r.name}  (${r.id})`));

    const migrated = await client.query('SELECT COUNT(*) c FROM jobs WHERE scheduled_at IS NOT NULL');
    console.log(`jobs with scheduled_at: ${migrated.rows[0].c}`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
