# Diseño: Sistema de Horario, Asignación de Equipo, API del Agente y Dashboard

**Fecha:** 2026-06-17
**Proyecto:** Motion Dreams Mini-ERP (Next.js 14 + PostgreSQL/Neon)

## Contexto y problema

El ERP funciona bien en workflow, finanzas, gastos y cuentas de clientes, y esos
sistemas se comunican entre sí. Hay tres problemas:

1. **Dashboard desactualizado**: las cifras financieras son correctas (coinciden con
   `/api/stats/finances`), pero contiene una barra "65% de capacidad" *hardcodeada* y
   no muestra a quién están asignados los trabajos.
2. **Sistema de horario con fallas**: bug de zona horaria (DATE parseado como UTC
   muestra el día anterior en UTC-5), sin detección de choques de horario, un hack con
   `setTimeout` para quitar asignación, y no existe el concepto de persona asignada.
3. **Integración de agentes incompleta**: existe una integración parcial de un agente
   de WhatsApp (n8n) vía tablas `agenda`, `conversations`, `messages`,
   `n8n_chat_histories`. La tabla `agenda` está vacía y desconectada de `jobs`. Los
   endpoints `/api/agent/*` no tienen autenticación.

## Principio rector

**El ERP es el sistema central.** Los agentes externos (n8n WhatsApp y OpenClaw)
**pueden leer** la base de datos, pero **no la editan directamente**. Toda mutación
(crear trabajos, cambiar estados, completar, crear clientes, asignar, agendar) ocurre
**exclusivamente a través de los endpoints `/api/agent/*`**, protegidos por token.

## Decisiones tomadas (brainstorming)

- **Asignación**: tabla `team_members` (extensible), no un enum rígido.
- **Consolidación**: `jobs` es la única fuente de verdad. La tabla `agenda` queda obsoleta.
- **Dashboard "Producción Activa"**: cuenta `status = 'PENDING'` (pendientes por entregar).
- **Token del agente**: header `Authorization: Bearer <AGENT_API_TOKEN>` (variable de entorno).
- **Marca "ya agendado"**: `scheduled_at IS NOT NULL`, expuesta como booleano `is_scheduled`.

---

## 1. Modelo de datos

### Nueva tabla `team_members`
```sql
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'DESIGNER', -- 'CEO' | 'DESIGNER'
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Seed idempotente: CEO, Diseñador 1, Diseñador 2
```

### Cambios a `jobs` (migración idempotente con `ADD COLUMN IF NOT EXISTS`)
- `assigned_to UUID REFERENCES team_members(id)` — persona asignada (nullable).
- `scheduled_at TIMESTAMPTZ` — inicio canónico (fecha + hora). Reemplaza la dupla
  `scheduled_date` (DATE) + `scheduled_time` (VARCHAR), que causa el bug de zona horaria.
- `actual_minutes INT` — duración real al completar (estimada ya existe en `estimated_minutes`).
- `source VARCHAR(20) DEFAULT 'ERP'` — 'ERP' | 'WHATSAPP' | 'OPENCLAW'.
- `external_ref VARCHAR(255) UNIQUE` — idempotencia: evita que un agente cree el mismo
  trabajo dos veces (p.ej. id de conversación). NULL permitido y no choca con el UNIQUE.

**Migración de datos**: poblar `scheduled_at` a partir de `scheduled_date` +
`scheduled_time` existentes, interpretando la hora en `America/Bogota`. Las columnas
viejas se mantienen temporalmente para no romper lecturas durante el despliegue, y los
readers se migran a `scheduled_at`. (Se pueden eliminar en una limpieza posterior.)

### `time_logs`
Se mantiene como histórico de auditoría (estimado vs real por trabajo). La duración real
canónica para lectura rápida vive en `jobs.actual_minutes`.

### Tabla `agenda`
Obsoleta. Se elimina (`DROP TABLE IF EXISTS agenda`) porque está vacía y `jobs` la
reemplaza por completo. Las tablas de conversación del bot (`conversations`, `messages`,
`n8n_chat_histories`) se conservan: son del canal de mensajería, no del dominio de trabajos.

---

## 2. Sistema de horario

### Lógica pura y testeable: `src/lib/schedule.ts`
Funciones sin dependencias de DB ni de red (unidades aisladas, fáciles de testear):
- `jobEndTime(start: Date, estimatedMinutes: number): Date`
- `hasOverlap(a: {start, minutes}, b: {start, minutes}): boolean`
- `getBusyBlocks(jobs): Block[]` — bloques ocupados de una lista de trabajos agendados.
- `findFreeSlots(busyBlocks, date, workday): Slot[]` — huecos libres dada una jornada.
- Jornada laboral configurable, default **09:00–18:00**, zona `America/Bogota`.

### Validación de choques
Al agendar/reasignar (UI y API del agente), se valida que el nuevo slot no se solape con
otro trabajo de la **misma persona**. Si hay choque: la UI muestra aviso; la API responde
`409 Conflict` con los trabajos en conflicto.

### Página `/schedule`
- Mantiene el gate de contraseña existente (`aaronbebe`) — fuera de alcance cambiarlo.
- Modal de asignación: seleccionar **persona** (CEO/Dis.1/Dis.2) + fecha + hora.
- Calendario agrupado por fecha (corregido el bug de zona horaria) con **filtro por persona**.
- Muestra duración **estimada vs real**.
- Aviso visual si el slot elegido choca con otro de esa persona.
- Se elimina el hack del `setTimeout` en "Quitar asignación".

---

## 3. API del agente (`/api/agent/*`)

### Autenticación
Helper `requireAgentToken(request): NextResponse | null` en `src/lib/agentAuth.ts`:
valida `Authorization: Bearer <AGENT_API_TOKEN>` contra la variable de entorno. Si falta
o es inválido, responde `401`. Se aplica al inicio de **todos** los handlers `/api/agent/*`.

### Endpoints
| Método | Ruta | Descripción | Estado |
|---|---|---|---|
| GET | `/api/agent/team` | Lista de asignables (`id`, `name`, `role`, `active`) | **nuevo** |
| GET | `/api/agent/availability?member_id=&date=&duration=` | Bloques ocupados de la persona ese día + si el slot propuesto está libre | **nuevo** |
| GET | `/api/agent/jobs` | Trabajos (incluye `is_scheduled`, `assigned_to`, `assigned_to_name`) | actualizar |
| POST | `/api/agent/jobs` | Crear trabajo (`client_id`, `title`, `price_cop`, `estimated_minutes`, opcional `assigned_to_id`, `scheduled_at`, `external_ref`). Idempotente por `external_ref`. | actualizar |
| PATCH | `/api/agent/jobs/[id]` | Cambiar estado / completar (con `actual_minutes`) / asignar / agendar. Valida choques al agendar. | actualizar |
| GET | `/api/agent/clients` | Leer clientes | añadir token |
| POST | `/api/agent/clients` | Crear cliente (`name`, opcional `company_name`, `phone`) | **nuevo** |
| GET | `/api/agent/system` | Stats globales | añadir token |

### Idempotencia (anti-duplicación de OpenClaw)
- Crear trabajo con un `external_ref` ya existente devuelve el trabajo existente
  (`200`) en lugar de crear otro (`201`).
- "Ya agendado" se determina por `scheduled_at IS NOT NULL` (`is_scheduled` en la respuesta),
  para que el agente no reagende un trabajo ya agendado.

---

## 4. Dashboard

- "Producción Activa / Pendientes por Entregar": cuenta `status = 'PENDING'`. Cada
  pendiente muestra **a quién está asignado**.
- Se **elimina la barra "65% de capacidad" hardcodeada** y se reemplaza por **carga real
  agendada** (minutos/horas agendados esta semana, agregados desde `jobs.scheduled_at`,
  opcionalmente desglosados por persona).
- Se verifica que ingresos/egresos/cartera (ya correctos) sigan coincidiendo con finanzas.
- Endpoint `/api/stats/dashboard` se amplía para incluir la carga agendada de la semana.

---

## 5. Pruebas

### Unitarias (lógica pura de `src/lib/schedule.ts`)
Sin framework pesado: script Node con asserts (estilo `scripts/test-api.js` existente),
o `node:test` integrado. Casos:
- `jobEndTime` calcula fin correcto.
- `hasOverlap`: solape parcial, contención, adyacencia (no solapan), sin solape.
- `findFreeSlots`: día vacío, día lleno, huecos entre trabajos, respeto de jornada.

### Integración (endpoints del agente, contra server local)
Script que verifica:
- `401` sin token / con token inválido; `200` con token válido.
- Crear cliente vía `POST /api/agent/clients`.
- Crear trabajo vía `POST /api/agent/jobs` (con y sin `assigned_to_id`).
- Idempotencia: crear dos veces con el mismo `external_ref` no duplica.
- `GET /api/agent/availability` reporta el bloque ocupado tras agendar.
- Agendar un slot que choca devuelve `409`.
- Completar con `actual_minutes` registra duración real y suma a la deuda del cliente.

Los datos de prueba creados se limpian al final del script.

---

## Unidades y límites

- `src/lib/schedule.ts` — lógica pura de horario (sin DB). Entrada: trabajos/fechas;
  salida: bloques/slots/booleanos. Testeable de forma aislada.
- `src/lib/agentAuth.ts` — validación de token. Una sola responsabilidad.
- `src/lib/db.ts` — acceso a Postgres (existente).
- Endpoints `/api/agent/*` — orquestan auth + DB + lógica de horario; thin handlers.
- `team_members` — fuente de verdad de personas; `jobs` — fuente de verdad de trabajos.

## Fuera de alcance

- Cambiar el gate de contraseña de `/schedule`.
- Eliminar las columnas viejas `scheduled_date`/`scheduled_time` (limpieza posterior).
- Construir los flujos n8n/OpenClaw en sí (este spec cubre los endpoints que consumirán).
- Roles/permisos por usuario más allá de CEO/DESIGNER.
