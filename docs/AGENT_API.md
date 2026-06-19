# API para Agentes — Motion Dreams ERP

Guía para los dos agentes (n8n WhatsApp y OpenClaw). **El ERP es el sistema central.**
Los agentes pueden **leer** datos, pero **toda creación/edición se hace por estos
endpoints** — nunca escribiendo directo en la base de datos.

---

## Conexión

- **Base URL:** `https://TU-DOMINIO` (en local: `http://localhost:3000`)
- **Autenticación (obligatoria en todos los `/api/agent/*`):**
  ```
  Authorization: Bearer <AGENT_API_TOKEN>
  Content-Type: application/json
  ```
  El token está en `.env.local` del servidor (`AGENT_API_TOKEN`). Sin token o con token
  inválido → `401 Unauthorized`.

## Convenciones

- **IDs**: UUID estables. Guárdalos para referenciar trabajos/clientes después.
- **Fechas de agenda (`scheduled_at`)**: usa formato ISO con zona de Colombia:
  `YYYY-MM-DDThh:mm:00-05:00` (ej. `2026-06-18T10:00:00-05:00` = 18 jun 10:00 a.m.).
- **`date` en disponibilidad**: fecha local de Bogotá `YYYY-MM-DD`.
- **Jornada laboral**: 09:00–18:00 (America/Bogota).
- **Duraciones**: en minutos (`estimated_minutes`, `actual_minutes`).
- **Dinero**: `price_cop` en pesos colombianos (entero).

---

## Endpoints

### 1. Equipo asignable
`GET /api/agent/team`

Devuelve las personas a las que se puede asignar un trabajo.
```json
[
  { "id": "4e502e74-...", "name": "CEO",         "role": "CEO",      "active": true },
  { "id": "e2839170-...", "name": "Diseñador 1", "role": "DESIGNER", "active": true },
  { "id": "d60282df-...", "name": "Diseñador 2", "role": "DESIGNER", "active": true }
]
```
> Llama esto primero y guarda los `id`. Los necesitas como `assigned_to_id`.

---

### 2. Disponibilidad de una persona
`GET /api/agent/availability?member_id=<uuid>&date=YYYY-MM-DD&duration=<min>&at=<ISO opcional>`

- `member_id` (req), `date` (req), `duration` (min, opcional), `at` (ISO, opcional).
- Si pasas `at`, responde si **ese** slot está libre (`is_available`).

```json
{
  "member_id": "4e502e74-...",
  "date": "2026-06-18",
  "workday": { "start": "2026-06-18T14:00:00.000Z", "end": "2026-06-18T23:00:00.000Z" },
  "busy": [ { "job_id": "...", "title": "Pack Reels", "start": "2026-06-18T15:00:00.000Z", "minutes": 60 } ],
  "free_slots": [ { "start": "...", "end": "...", "minutes": 480 } ],
  "requested_slot": { "at": "2026-06-18T10:00:00-05:00", "duration": 60 },
  "is_available": true
}
```
> Úsalo para responder "¿está libre el CEO el martes a las 3pm?" y para proponer horarios.

---

### 3. Trabajos (jobs)

**Listar pendientes** — `GET /api/agent/jobs`
Incluye `id`, `client_name`, `title`, `status`, `estimated_minutes`, `actual_minutes`,
`scheduled_at`, **`is_scheduled`** (true/false), `assigned_to`, `assigned_to_name`,
`external_ref`.

**Crear trabajo** — `POST /api/agent/jobs`
```json
{
  "client_id": "<uuid>",              // requerido
  "title": "Pack de 10 Reels",        // requerido
  "description": "…",                 // opcional
  "price_cop": 350000,                // opcional
  "estimated_minutes": 120,           // opcional
  "due_date": "2026-06-25",           // opcional
  "assigned_to_id": "<uuid team>",    // opcional (CEO / Diseñador 1 / 2)
  "scheduled_at": "2026-06-18T10:00:00-05:00", // opcional
  "external_ref": "wa-conv-573001234567-001"   // opcional pero RECOMENDADO
}
```
Respuestas:
- `201` → trabajo creado.
- `200` → ya existía un trabajo con ese `external_ref` (idempotencia, **no duplica**).
- `409` → **conflicto de horario** (la persona ya tiene algo en ese rango). Body:
  `{ "error": "Conflicto de horario", "conflicts": [ { "id", "title", "scheduled_at", "estimated_minutes" } ] }`
- `400` → faltan `client_id` o `title`.

**Actualizar / asignar / agendar / completar** — `PATCH /api/agent/jobs/<id>`
```json
{
  "status": "COMPLETED",              // 'PENDING' | 'COMPLETED'
  "actual_minutes": 95,               // duración real (al completar)
  "assigned_to_id": "<uuid team>",    // reasignar
  "scheduled_at": "2026-06-19T09:00:00-05:00" // reagendar (o null para quitar)
}
```
- Al pasar `status: "COMPLETED"` se suma el precio a la deuda del cliente y se registra
  la duración real.
- Reagendar/reasignar a un horario ocupado de esa persona → `409` con `conflicts`.

---

### 4. Clientes

**Listar** — `GET /api/agent/clients` → `id`, `name`, `company_name`, `phone`, `total_debt_cop`.

**Crear** — `POST /api/agent/clients`
```json
{ "name": "Juan Pérez", "company_name": "Acme", "phone": "573001234567" }
```
- `201` → cliente creado.
- `200` → ya existía un cliente con ese `phone` (devuelve el existente, **no duplica**).
- `400` → falta `name`.

---

### 5. Pagos (abonos)

> **Importante:** un pago `PENDING` **no** afecta la deuda ni los ingresos. Solo cuando el
> CEO lo confirma (pasa a `CONFIRMED`) se descuenta de la deuda del cliente y cuenta como
> ingreso. Los pagos creados como `CONFIRMED` se aplican de inmediato.

**Registrar pago** — `POST /api/agent/payments`
```json
{
  "client_id": "<uuid>",            // requerido
  "amount_cop": 35000,              // requerido, > 0
  "job_id": "<uuid>",               // opcional (vincular a un trabajo)
  "kind": "DEPOSIT",                // opcional: 'DEPOSIT' (anticipo) | 'FINAL' (pago final)
  "status": "PENDING",              // 'PENDING' (default) | 'CONFIRMED'
  "payment_method": "Nequi",        // opcional (default 'WhatsApp')
  "external_ref": "wa-573...-pay-001", // opcional pero RECOMENDADO (idempotente)
  "notes": "…"                      // opcional
}
```
Respuestas: `201` creado · `200` ya existía ese `external_ref` (no duplica) · `400` datos inválidos.

**Confirmar pago** — `PATCH /api/agent/payments/<id>`
```json
{ "status": "CONFIRMED" }
```
- Al confirmar: descuenta de la deuda, sella `payment_date` y, si el saldo llega a 0,
  marca como `PAID` los trabajos entregados del cliente.
- Idempotente: confirmar un pago ya confirmado no vuelve a aplicar el descuento.
- No se puede revertir un `CONFIRMED` a `PENDING` (`409`).

**Listar pagos** — `GET /api/agent/payments?client_id=<uuid>&status=PENDING|CONFIRMED`
Devuelve `id`, `client_id`, `job_id`, `amount_cop`, `kind`, `status`, `payment_method`,
`external_ref`, `payment_date`, `notes`.

---

### 6. Estado de cuenta en PDF
`GET /api/agent/clients/<id>/statement`

Devuelve el **PDF** (`application/pdf`) del estado de cuenta del cliente: proyectos
entregados, abonos confirmados, saldo pendiente y datos de pago (Bancolombia / Nequi).
Úsalo para enviarlo por WhatsApp. Solo considera pagos **CONFIRMED** y el saldo real actual.

> En n8n: nodo HTTP Request con `Response Format: File` y el header Authorization; el
> binario resultante se adjunta al mensaje de WhatsApp.

---

### 7. Estado global del negocio
`GET /api/agent/system` → ingresos/egresos del mes y totales, cartera, trabajos pendientes:
```json
{
  "income_month_cop": 840000, "income_total_cop": 1800000,
  "expenses_month_cop": 620000, "expenses_total_cop": 1050000,
  "total_client_debt_cop": 1905000,
  "active_pending_jobs_count": 2, "active_pending_jobs_value_cop": 120000,
  "system_date": "2026-06-17T..."
}
```

---

## Flujo recomendado para crear y agendar un trabajo

1. `GET /api/agent/team` → obtener el `id` de CEO / Diseñador 1 / Diseñador 2.
2. (Si es cliente nuevo) `POST /api/agent/clients` → obtener `client_id`.
3. `GET /api/agent/availability?member_id=…&date=…&at=…&duration=…` → confirmar que el
   horario propuesto está libre (`is_available: true`).
4. `POST /api/agent/jobs` con `assigned_to_id`, `scheduled_at`, `estimated_minutes` y un
   `external_ref` único. Si responde `409`, vuelve al paso 3 y propone otro horario.
5. Al terminar el trabajo: `PATCH /api/agent/jobs/<id>` con `status: "COMPLETED"` y
   `actual_minutes`.

## Reglas anti-duplicación (importante para OpenClaw)

- Manda siempre un **`external_ref` estable** al crear trabajos (ej.
  `wa-<telefono>-<idMensaje>` o el id de tarea de tu sistema). Reintentar la misma
  creación devuelve el trabajo existente (`200`), no crea otro.
- Antes de agendar, revisa **`is_scheduled`** en `GET /api/agent/jobs`. Si es `true`, el
  trabajo ya tiene horario → **no lo reagendes**.
- Respeta el `409`: significa choque real; no insistas con el mismo horario.
