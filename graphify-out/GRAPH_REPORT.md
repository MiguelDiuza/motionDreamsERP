# Graph Report - .  (2026-06-26)

## Corpus Check
- Corpus is ~30,003 words - fits in a single context window. You may not need a graph.

## Summary
- 291 nodes · 436 edges · 24 communities (16 shown, 8 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.81)
- Token cost: 46,915 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_API Routes & DB Access|API Routes & DB Access]]
- [[_COMMUNITY_Frontend Pages & UI|Frontend Pages & UI]]
- [[_COMMUNITY_Architecture & Agent API Docs|Architecture & Agent API Docs]]
- [[_COMMUNITY_NPM Dependencies|NPM Dependencies]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Schedule Logic (AvailabilityConflicts)|Schedule Logic (Availability/Conflicts)]]
- [[_COMMUNITY_Agent Flow Integration Test|Agent Flow Integration Test]]
- [[_COMMUNITY_Payments Flow Integration Test|Payments Flow Integration Test]]
- [[_COMMUNITY_Account Statement PDF|Account Statement PDF]]
- [[_COMMUNITY_App Layout & Sidebar|App Layout & Sidebar]]
- [[_COMMUNITY_Schedule Migration|Schedule Migration]]
- [[_COMMUNITY_Payments Migration|Payments Migration]]
- [[_COMMUNITY_Legacy V2 Migration|Legacy V2 Migration]]
- [[_COMMUNITY_DB Check Script|DB Check Script]]
- [[_COMMUNITY_Claude Settings|Claude Settings]]
- [[_COMMUNITY_DB Cleanup Script|DB Cleanup Script]]
- [[_COMMUNITY_DB Dump Script|DB Dump Script]]
- [[_COMMUNITY_DB Probe  Seed Script|DB Probe / Seed Script]]
- [[_COMMUNITY_DB Diagnostics Script|DB Diagnostics Script]]
- [[_COMMUNITY_Finances API Test|Finances API Test]]

## God Nodes (most connected - your core abstractions)
1. `query()` - 60 edges
2. `requireAgentToken()` - 22 edges
3. `compilerOptions` - 16 edges
4. `findScheduleConflicts()` - 11 edges
5. `Agent API (Motion Dreams ERP)` - 10 edges
6. `scripts` - 6 edges
7. `GET()` - 6 edges
8. `applyConfirmedPaymentToDebt()` - 6 edges
9. `findConflicts()` - 6 edges
10. `findFreeSlots()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `PDF Generator (pdfGenerator.js)` --conceptually_related_to--> `Account Statement PDF Endpoint (GET /api/agent/clients/[id]/statement)`  [INFERRED]
  ARCHITECTURE.md → docs/AGENT_API.md
- `GET()` --calls--> `query()`  [INFERRED]
  src/app/api/clients/[id]/jobs/route.ts → src/lib/db.ts
- `PATCH()` --calls--> `query()`  [INFERRED]
  src/app/api/clients/[id]/route.ts → src/lib/db.ts
- `DELETE()` --calls--> `query()`  [INFERRED]
  src/app/api/clients/[id]/route.ts → src/lib/db.ts
- `GET()` --calls--> `query()`  [INFERRED]
  src/app/api/clients/route.ts → src/lib/db.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agent API Endpoint Set** — docs_agent_api_team_endpoint, docs_agent_api_availability_endpoint, docs_agent_api_jobs_endpoint, docs_agent_api_clients_endpoint, docs_agent_api_payments_endpoint, docs_agent_api_statement_endpoint, docs_agent_api_system_endpoint [EXTRACTED 1.00]
- **Payment Lifecycle Flow (create PENDING -> confirm -> debt applied)** — docs_agent_api_payments_endpoint, docs_agent_api_payment_lifecycle, docs_agent_api_statement_endpoint [EXTRACTED 0.95]
- **Scheduling Flow (team -> availability -> assign)** — docs_agent_api_team_endpoint, docs_agent_api_availability_endpoint, docs_agent_api_jobs_endpoint, specs_horario_conflict_free_scheduling [EXTRACTED 0.95]

## Communities (24 total, 8 thin omitted)

### Community 0 - "API Routes & DB Access"
Cohesion: 0.08
Nodes (39): DELETE(), GET(), GET(), POST(), PUT(), requireAgentToken(), pool, query() (+31 more)

### Community 1 - "Frontend Pages & UI"
Cohesion: 0.06
Nodes (19): Dashboard(), formatHours(), WorkDoneCard(), Client, ClientTableProps, Expense, generateAccountStatementPDF(), generateMonthlyReportPDF() (+11 more)

### Community 2 - "Architecture & Agent API Docs"
Cohesion: 0.09
Nodes (34): AccountStatement Component, FIFO Calculations Logic (calculations.js), Frontend (Next.js App Router, src/app), Shared Library Logic (src/lib), Motion Dreams Mini-ERP (Next.js Structure), PDF Generator (pdfGenerator.js), Availability Endpoint (GET /api/agent/availability), Clients Endpoint (/api/agent/clients) (+26 more)

### Community 3 - "NPM Dependencies"
Cohesion: 0.06
Nodes (32): dependencies, clsx, framer-motion, jspdf, jspdf-autotable, lucide-react, next, pg (+24 more)

### Community 4 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 5 - "Schedule Logic (Availability/Conflicts)"
Cohesion: 0.27
Nodes (13): GET(), Block, bogotaDateString(), bogotaWorkdayBounds(), findConflicts(), findFreeSlots(), getBusyBlocks(), hasOverlap() (+5 more)

### Community 6 - "Agent Flow Integration Test"
Cohesion: 0.18
Nodes (6): auth, created, fs, path, { Pool }, TOKEN

### Community 7 - "Payments Flow Integration Test"
Cohesion: 0.18
Nodes (6): auth, created, fs, path, { Pool }, TOKEN

### Community 8 - "Account Statement PDF"
Cohesion: 0.39
Nodes (6): buildAccountStatementPdf(), fmtDate(), Job, money(), Payment, GET()

### Community 10 - "Schedule Migration"
Cohesion: 0.40
Nodes (3): fs, path, { Pool }

### Community 11 - "Payments Migration"
Cohesion: 0.40
Nodes (3): fs, path, { Pool }

### Community 12 - "Legacy V2 Migration"
Cohesion: 0.40
Nodes (3): envConfig, fs, { Pool }

## Knowledge Gaps
- **103 isolated node(s):** `allow`, `{ Pool }`, `{ Pool }`, `{ Pool }`, `fs` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `API Routes & DB Access` to `Account Statement PDF`, `Schedule Logic (Availability/Conflicts)`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `requireAgentToken()` connect `API Routes & DB Access` to `Account Statement PDF`, `Schedule Logic (Availability/Conflicts)`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 25 inferred relationships involving `query()` (e.g. with `GET()` and `POST()`) actually correct?**
  _`query()` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `requireAgentToken()` (e.g. with `GET()` and `POST()`) actually correct?**
  _`requireAgentToken()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `findScheduleConflicts()` (e.g. with `PATCH()` and `POST()`) actually correct?**
  _`findScheduleConflicts()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `allow`, `{ Pool }`, `{ Pool }` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Routes & DB Access` be split into smaller, more focused modules?**
  _Cohesion score 0.07886904761904762 - nodes in this community are weakly interconnected._