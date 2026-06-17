/**
 * Integration test for the agent API + schedule conflict logic.
 * Requires the dev server running on localhost:3000.
 * Run: node scripts/test-agent-flow.js
 * Cleans up all data it creates.
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

function env(key) {
  if (process.env[key]) return process.env[key];
  const envPath = path.join(__dirname, '..', '.env.local');
  const line = fs.readFileSync(envPath, 'utf8').split('\n').find((l) => l.startsWith(key + '='));
  return line ? line.slice(line.indexOf('=') + 1).trim() : undefined;
}

const TOKEN = env('AGENT_API_TOKEN');
const pool = new Pool({ connectionString: env('DATABASE_URL') });

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

const auth = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const created = { clients: [], jobs: [] };

// Tomorrow 10:00 Bogota as TIMESTAMPTZ string.
function bogotaSlot(hour, min = 0) {
  const now = new Date(Date.now() + 24 * 3600000);
  const local = new Date(now.getTime() - 5 * 3600000);
  const d = local.toISOString().split('T')[0];
  return `${d}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00-05:00`;
}
function dateKey() {
  const now = new Date(Date.now() + 24 * 3600000);
  const local = new Date(now.getTime() - 5 * 3600000);
  return local.toISOString().split('T')[0];
}

(async () => {
  try {
    // 0. Auth gate
    let r = await fetch(`${BASE}/api/agent/jobs`);
    check('GET /api/agent/jobs without token -> 401', r.status === 401);
    r = await fetch(`${BASE}/api/agent/jobs`, { headers: { Authorization: 'Bearer wrong' } });
    check('GET /api/agent/jobs with bad token -> 401', r.status === 401);

    // 1. Team
    r = await fetch(`${BASE}/api/agent/team`, { headers: auth });
    const team = await r.json();
    check('GET /api/agent/team returns 3 members', Array.isArray(team) && team.length >= 3);
    const ceo = team.find((m) => m.role === 'CEO');
    check('team has a CEO', !!ceo);

    // 2. Create client (idempotent by phone)
    const phone = '57300' + Math.floor(1000000 + Math.random() * 8999999);
    r = await fetch(`${BASE}/api/agent/clients`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'TEST Cliente', phone }) });
    const client = await r.json();
    created.clients.push(client.id);
    check('POST /api/agent/clients -> 201', r.status === 201 && client.id);
    r = await fetch(`${BASE}/api/agent/clients`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'TEST Cliente dup', phone }) });
    const client2 = await r.json();
    check('POST same phone is idempotent (returns same id)', client2.id === client.id);

    // 3. Create job assigned to CEO at 10:00, 60 min
    const ext = 'test-ext-' + Date.now();
    r = await fetch(`${BASE}/api/agent/jobs`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ client_id: client.id, title: 'TEST Job A', price_cop: 100000, estimated_minutes: 60, assigned_to_id: ceo.id, scheduled_at: bogotaSlot(10), external_ref: ext }),
    });
    const jobA = await r.json();
    created.jobs.push(jobA.id);
    check('POST /api/agent/jobs (assigned + scheduled) -> 201', r.status === 201 && jobA.id);
    check('job A is_scheduled implied (scheduled_at set)', !!jobA.scheduled_at);

    // 4. Idempotency by external_ref
    r = await fetch(`${BASE}/api/agent/jobs`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ client_id: client.id, title: 'TEST Job A dup', price_cop: 1, estimated_minutes: 30, external_ref: ext }),
    });
    const jobADup = await r.json();
    check('POST same external_ref returns existing job (200, same id)', r.status === 200 && jobADup.id === jobA.id);

    // 5. Conflict: another job for CEO at 10:30 (overlaps 10:00-11:00) -> 409
    r = await fetch(`${BASE}/api/agent/jobs`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ client_id: client.id, title: 'TEST Job B (overlap)', price_cop: 50000, estimated_minutes: 60, assigned_to_id: ceo.id, scheduled_at: bogotaSlot(10, 30) }),
    });
    check('POST overlapping slot for same person -> 409', r.status === 409);

    // 6. Non-conflict: CEO at 11:00 (adjacent) -> 201
    r = await fetch(`${BASE}/api/agent/jobs`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ client_id: client.id, title: 'TEST Job C (adjacent)', price_cop: 50000, estimated_minutes: 60, assigned_to_id: ceo.id, scheduled_at: bogotaSlot(11) }),
    });
    const jobC = await r.json();
    if (jobC.id) created.jobs.push(jobC.id);
    check('POST adjacent slot (11:00 after 10:00-11:00) -> 201', r.status === 201 && jobC.id);

    // 7. Availability reflects busy blocks
    r = await fetch(`${BASE}/api/agent/availability?member_id=${ceo.id}&date=${dateKey()}&duration=60`, { headers: auth });
    const avail = await r.json();
    check('GET availability lists busy blocks (>=2)', Array.isArray(avail.busy) && avail.busy.length >= 2);
    check('GET availability returns free_slots', Array.isArray(avail.free_slots));

    // 8. Availability check for a free slot via ?at
    r = await fetch(`${BASE}/api/agent/availability?member_id=${ceo.id}&date=${dateKey()}&duration=60&at=${encodeURIComponent(bogotaSlot(14))}`, { headers: auth });
    const availAt = await r.json();
    check('availability ?at=14:00 is_available true', availAt.is_available === true);
    r = await fetch(`${BASE}/api/agent/availability?member_id=${ceo.id}&date=${dateKey()}&duration=60&at=${encodeURIComponent(bogotaSlot(10, 15))}`, { headers: auth });
    const availAt2 = await r.json();
    check('availability ?at=10:15 (busy) is_available false', availAt2.is_available === false);

    // 9. Complete job A with real duration
    r = await fetch(`${BASE}/api/agent/jobs/${jobA.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ status: 'COMPLETED', actual_minutes: 75 }) });
    const completed = await r.json();
    check('PATCH complete job sets actual_minutes', completed.actual_minutes === 75 && completed.status === 'COMPLETED');

    // verify time_log + debt
    const tl = await pool.query('SELECT * FROM time_logs WHERE job_id = $1', [jobA.id]);
    check('time_log recorded on completion', tl.rowCount === 1 && tl.rows[0].actual_minutes === 75);
    const cl = await pool.query('SELECT total_debt FROM clients WHERE id = $1', [client.id]);
    check('client debt increased by job price on completion', parseFloat(cl.rows[0].total_debt) === 100000);

  } catch (e) {
    failed++;
    console.error('  EXCEPTION', e.message);
  } finally {
    // Cleanup
    for (const jid of created.jobs) await pool.query('DELETE FROM time_logs WHERE job_id = $1', [jid]);
    for (const jid of created.jobs) await pool.query('DELETE FROM jobs WHERE id = $1', [jid]);
    for (const cid of created.clients) await pool.query('DELETE FROM jobs WHERE client_id = $1', [cid]);
    for (const cid of created.clients) await pool.query('DELETE FROM clients WHERE id = $1', [cid]);
    await pool.end();
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
})();
