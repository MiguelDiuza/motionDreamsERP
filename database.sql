-- Motion Dreams ERP - PostgreSQL Schema (Optimized)
-- Refleja el estado actual incluyendo las migraciones:
--   scripts/migrate_horario.js  (horario + asignación de equipo)
--   scripts/migrate_payments.js (pagos de agente: kind/status/idempotencia)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLIENTS
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(50),
    total_debt DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.5 TEAM MEMBERS (personas asignables a un trabajo)
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'DESIGNER', -- 'CEO' | 'DESIGNER'
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed inicial
INSERT INTO team_members (name, role) VALUES
    ('CEO', 'CEO'),
    ('Diseñador 1', 'DESIGNER'),
    ('Diseñador 2', 'DESIGNER');

-- 2. JOBS (Tasks / Proyectos)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING' | 'COMPLETED' | 'PAID'
    completion_date TIMESTAMP WITH TIME ZONE,
    hours_estimated INT DEFAULT 0,
    progress_level INT DEFAULT 0,
    estimated_minutes INT DEFAULT 0,        -- duración estimada
    actual_minutes INT,                     -- duración real (al completar)
    assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL, -- CEO / Diseñador
    scheduled_at TIMESTAMPTZ,               -- inicio agendado (fuente de verdad de horario)
    source VARCHAR(20) DEFAULT 'ERP',       -- 'ERP' | 'WHATSAPP' | 'OPENCLAW'
    external_ref VARCHAR(255),              -- idempotencia para agentes
    -- Columnas legacy mantenidas por compatibilidad; reemplazadas por scheduled_at:
    scheduled_date DATE,
    scheduled_time VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.5 TIME LOGS (histórico estimado vs real por trabajo)
CREATE TABLE time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    estimated_minutes INT DEFAULT 0,
    actual_minutes INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PAYMENTS (Abonos)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,  -- opcional
    amount DECIMAL(12, 2) NOT NULL,
    kind VARCHAR(20),                       -- 'DEPOSIT' (anticipo) | 'FINAL' (pago final)
    status VARCHAR(20) DEFAULT 'CONFIRMED', -- 'PENDING' | 'CONFIRMED' (solo CONFIRMED afecta deuda/ingresos)
    payment_method VARCHAR(50),             -- 'Transfer', 'Cash', 'Nequi', 'WhatsApp'...
    external_ref VARCHAR(255),              -- idempotencia para agentes
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- 4. EXPENSES
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'BUSINESS', 'PERSONAL'
    subcategory VARCHAR(50),
    is_paid BOOLEAN DEFAULT FALSE,
    due_date DATE,
    paid_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_clients_debt ON clients(total_debt DESC);
CREATE INDEX idx_jobs_due_date ON jobs(due_date ASC);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_assigned_to ON jobs(assigned_to);
CREATE INDEX idx_jobs_scheduled_at ON jobs(scheduled_at);
CREATE UNIQUE INDEX idx_jobs_external_ref ON jobs(external_ref) WHERE external_ref IS NOT NULL;
CREATE INDEX idx_expenses_paid ON expenses(is_paid);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_job_id ON payments(job_id);
CREATE UNIQUE INDEX idx_payments_external_ref ON payments(external_ref) WHERE external_ref IS NOT NULL;

-- Nota: las tablas del canal de mensajería del agente (conversations, messages,
-- n8n_chat_histories) son gestionadas por la integración de n8n, no por el ERP.
-- La antigua tabla `agenda` fue eliminada; `jobs` es la única fuente de verdad.
