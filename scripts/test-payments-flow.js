/**
 * Integration test for agent payments + statement PDF. Requires dev server on :3000.
 * Run: node scripts/test-payments-flow.js   (cleans up its own data)
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
function env(key) {
  if (process.env[key]) return process.env[key];
  const p = path.join(__dirname, '..', '.env.local');
  const line = fs.readFileSync(p, 'utf8').split('\n').find((l) => l.startsWith(key + '='));
  return line ? line.slice(line.indexOf('=') + 1).trim() : undefined;
}
const TOKEN = env('AGENT_API_TOKEN');
const pool = new Pool({ connectionString: env('DATABASE_URL') });
const auth = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

let passed = 0, failed = 0;
const check = (n, c) => { if (c) { passed++; console.log('  ok   ' + n); } else { failed++; console.log('  FAIL ' + n); } };

async function debt(id) { return parseFloat((await pool.query('SELECT total_debt FROM clients WHERE id=$1', [id])).rows[0].total_debt); }
async function incomeTotal() { const r = await fetch(`${BASE}/api/agent/system`, { headers: auth }); return (await r.json()).income_total_cop; }

const created = { clients: [], jobs: [], payments: [] };

(async () => {
  try {
    let r = await fetch(`${BASE}/api/agent/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    check('POST /api/agent/payments without token -> 401', r.status === 401);

    // Setup: client + completed job worth 100000 -> debt 100000
    const c = await pool.query("INSERT INTO clients (name) VALUES ('TEST PAY') RETURNING id");
    const cid = c.rows[0].id; created.clients.push(cid);
    const j = await pool.query("INSERT INTO jobs (client_id,title,price,status) VALUES ($1,'TEST job',100000,'PENDING') RETURNING id", [cid]);
    const jid = j.rows[0].id; created.jobs.push(jid);
    r = await fetch(`${BASE}/api/agent/jobs/${jid}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ status: 'COMPLETED' }) });
    check('setup: complete job -> debt 100000', (await debt(cid)) === 100000);

    const incomeBefore = await incomeTotal();

    // PENDING payment does NOT change debt or income
    const ext1 = 'test-pay-' + Date.now();
    r = await fetch(`${BASE}/api/agent/payments`, { method: 'POST', headers: auth, body: JSON.stringify({ client_id: cid, job_id: jid, amount_cop: 40000, kind: 'DEPOSIT', status: 'PENDING', external_ref: ext1 }) });
    const pend = await r.json(); created.payments.push(pend.id);
    check('POST PENDING payment -> 201', r.status === 201 && pend.status === 'PENDING');
    check('PENDING does not change debt (still 100000)', (await debt(cid)) === 100000);
    check('PENDING does not change income', (await incomeTotal()) === incomeBefore);

    // Idempotency
    r = await fetch(`${BASE}/api/agent/payments`, { method: 'POST', headers: auth, body: JSON.stringify({ client_id: cid, amount_cop: 999, external_ref: ext1 }) });
    const dup = await r.json();
    check('POST same external_ref -> 200 same id (idempotent)', r.status === 200 && dup.id === pend.id);

    // Confirm -> debt drops by 40000, income +40000
    r = await fetch(`${BASE}/api/agent/payments/${pend.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ status: 'CONFIRMED' }) });
    check('PATCH confirm -> 200', r.status === 200);
    check('confirm reduces debt to 60000', (await debt(cid)) === 60000);
    check('confirm adds to income (+40000)', (await incomeTotal()) === incomeBefore + 40000);

    // Confirm again is a no-op (not double applied)
    r = await fetch(`${BASE}/api/agent/payments/${pend.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ status: 'CONFIRMED' }) });
    check('re-confirm does not double-apply (debt still 60000)', (await debt(cid)) === 60000);

    // Direct CONFIRMED payment settles account -> jobs become PAID
    const ext2 = ext1 + '-b';
    r = await fetch(`${BASE}/api/agent/payments`, { method: 'POST', headers: auth, body: JSON.stringify({ client_id: cid, amount_cop: 60000, kind: 'FINAL', status: 'CONFIRMED', external_ref: ext2 }) });
    const conf = await r.json(); created.payments.push(conf.id);
    check('POST CONFIRMED settles debt to 0', (await debt(cid)) === 0);
    const jobStatus = (await pool.query('SELECT status FROM jobs WHERE id=$1', [jid])).rows[0].status;
    check('settled account marks job PAID', jobStatus === 'PAID');

    // Statement PDF
    r = await fetch(`${BASE}/api/agent/clients/${cid}/statement`, { headers: auth });
    const ct = r.headers.get('content-type') || '';
    const buf = Buffer.from(await r.arrayBuffer());
    check('GET statement -> 200 application/pdf', r.status === 200 && ct.includes('application/pdf'));
    check('statement body is a real PDF (%PDF header)', buf.slice(0, 4).toString() === '%PDF' && buf.length > 1000);

    // /api/payments default hides nothing pending now (all confirmed)
    r = await fetch(`${BASE}/api/payments?client_id=${cid}`);
    const confirmedList = await r.json();
    check('/api/payments default returns 2 confirmed', Array.isArray(confirmedList) && confirmedList.length === 2);

  } catch (e) {
    failed++; console.error('  EXCEPTION', e.message);
  } finally {
    for (const cid of created.clients) {
      await pool.query('DELETE FROM payments WHERE client_id=$1', [cid]);
      await pool.query('DELETE FROM jobs WHERE client_id=$1', [cid]);
      await pool.query('DELETE FROM clients WHERE id=$1', [cid]);
    }
    await pool.end();
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
})();
