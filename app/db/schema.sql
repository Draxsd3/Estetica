-- ============================================================================
-- Aurora — Plataforma de Gestão para Clínica de Estética
-- Schema de produção (PostgreSQL 15+)
--
-- Convenções:
--   • Identificadores: UUID (gen_random_uuid) — nunca IDs sequenciais expostos.
--   • Dinheiro: BIGINT em centavos (evita erro de ponto flutuante).
--   • Datas/horas: timestamptz, armazenadas em UTC, exibidas em America/Sao_Paulo.
--   • Exclusão lógica em cadastros; imutabilidade em financeiro/prontuário via trigger.
--   • tenant_id presente desde o dia 1 (multi-unidade/SaaS sem migração futura).
-- ============================================================================

-- Extensões necessárias (executar como superusuário ou com privilégio de criação)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 0. Tabela de tenant (clínica / unidade)
-- ---------------------------------------------------------------------------
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    cnpj            TEXT UNIQUE,
    fantasy_name    TEXT,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    city            TEXT,
    state           CHAR(2),
    zip_code        CHAR(8),
    time_zone       TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    logo_url        TEXT,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 1. Usuários e controle de acesso
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    email           TEXT NOT NULL,
    password_hash   TEXT NOT NULL,              -- bcrypt/argon2, nunca texto plano
    name            TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('owner','manager','receptionist','professional','finance')),
    active          BOOLEAN NOT NULL DEFAULT true,
    mfa_enabled     BOOLEAN NOT NULL DEFAULT false,
    mfa_secret      TEXT,                       -- TOTP base32, criptografado em repouso
    last_sign_in_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT users_email_tenant_unique UNIQUE (tenant_id, email)
);

CREATE TABLE user_sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   TEXT NOT NULL,                -- hash do refresh token
    expires_at   TIMESTAMPTZ NOT NULL,
    ip_address   INET,
    user_agent   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE password_resets (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Profissionais de saúde
-- ---------------------------------------------------------------------------
CREATE TABLE professionals (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    user_id          UUID REFERENCES users(id) ON DELETE SET NULL, -- login próprio, opcional
    name             TEXT NOT NULL,
    role             TEXT NOT NULL,                         -- biomédico, esteticista, médico, enfermeiro
    council_type     TEXT,                                  -- CFM, CRBM, CREFONO, etc.
    council_number   TEXT,
    council_uf       CHAR(2),
    color            TEXT NOT NULL DEFAULT '#1F4E43',       -- cor da agenda
    commission_pct   NUMERIC(5,2) NOT NULL DEFAULT 10,      -- percentual padrão
    commission_base  TEXT NOT NULL DEFAULT 'received'       -- 'sold' | 'received' | 'executed'
        CHECK (commission_base IN ('sold','received','executed')),
    active           BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT professionals_council_unique UNIQUE (tenant_id, council_type, council_number, council_uf)
);

-- ---------------------------------------------------------------------------
-- 3. Pacientes (dados sensíveis LGPD)
-- ---------------------------------------------------------------------------
CREATE TABLE patients (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    name              TEXT NOT NULL,
    social_name       TEXT,
    cpf               TEXT UNIQUE,
    birth_date        DATE,
    phone             TEXT,
    email             TEXT,
    address           TEXT,
    city              TEXT,
    state             CHAR(2),
    zip_code          CHAR(8),
    responsible_id    UUID REFERENCES patients(id),        -- menor / responsável legal
    origin            TEXT,                                -- canal de captação
    campaign          TEXT,
    alerts            TEXT,                                -- alergias, contraindicações
    notes             TEXT,
    marketing_consent BOOLEAN NOT NULL DEFAULT false,
    image_consent     BOOLEAN NOT NULL DEFAULT false,
    data_consent_at   TIMESTAMPTZ,                         -- momento do consentimento LGPD
    active            BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ                          -- exclusão lógica (LGPD: anonimizar após prazo)
);

-- ---------------------------------------------------------------------------
-- 4. Catálogo de serviços e ficha técnica (custo real)
-- ---------------------------------------------------------------------------
CREATE TABLE services (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    name              TEXT NOT NULL,
    category          TEXT NOT NULL,
    minutes           INTEGER NOT NULL DEFAULT 60 CHECK (minutes > 0),
    price_cents       BIGINT NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
    requires_prescription BOOLEAN NOT NULL DEFAULT false, -- toxina botulínica etc.
    requires_evaluation BOOLEAN NOT NULL DEFAULT false,
    active            BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE service_price_history (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id     UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    price_cents    BIGINT NOT NULL CHECK (price_cents >= 0),
    valid_from     DATE NOT NULL,
    valid_until    DATE,
    created_by     UUID REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE service_materials (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    qty         NUMERIC(10,4) NOT NULL CHECK (qty > 0),
    notes       TEXT,
    CONSTRAINT service_materials_unique UNIQUE (service_id, product_id)
);

-- ---------------------------------------------------------------------------
-- 5. Produtos / insumos e estoque por lote
-- ---------------------------------------------------------------------------
CREATE TABLE products (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    name             TEXT NOT NULL,
    type             TEXT NOT NULL CHECK (type IN ('consumable','resale','equipment')),
    unit             TEXT NOT NULL DEFAULT 'un',
    cost_cents       BIGINT NOT NULL DEFAULT 0 CHECK (cost_cents >= 0), -- custo médio ponderado
    min_stock        NUMERIC(10,4) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    lot_controlled   BOOLEAN NOT NULL DEFAULT true,
    anvisa_register  TEXT,                                              -- registro ANVISA quando aplicável
    active           BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stock_lots (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id   UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    lot_code     TEXT NOT NULL,
    expires_on   DATE NOT NULL,
    qty          NUMERIC(10,4) NOT NULL DEFAULT 0 CHECK (qty >= 0),
    qty_initial  NUMERIC(10,4) NOT NULL DEFAULT 0,
    supplier     TEXT,
    cost_cents   BIGINT NOT NULL DEFAULT 0,        -- custo de entrada deste lote
    received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    active       BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT stock_lots_unique UNIQUE (product_id, lot_code)
);

CREATE TABLE stock_moves (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    lot_id      UUID REFERENCES stock_lots(id) ON DELETE SET NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('in','out','adjust','loss','return')),
    qty         NUMERIC(10,4) NOT NULL,
    reason      TEXT,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL, -- rastreio reverso
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. Orçamentos (documento central — versionado e imutável após envio)
-- ---------------------------------------------------------------------------
CREATE TABLE quotes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    number          INTEGER NOT NULL,               -- sequencial por clínica
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
    parent_id       UUID REFERENCES quotes(id) ON DELETE RESTRICT, -- versão anterior
    version         INTEGER NOT NULL DEFAULT 1,
    status          TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','sent','negotiation','approved','converted','refused','expired')),
    valid_until     DATE NOT NULL,
    subtotal_cents  BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
    discount_cents  BIGINT NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
    total_cents     BIGINT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
    notes           TEXT,
    lost_reason     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at         TIMESTAMPTZ,
    approved_at     TIMESTAMPTZ,
    approved_by     UUID REFERENCES users(id),
    CONSTRAINT quotes_number_tenant_unique UNIQUE (tenant_id, number),
    CONSTRAINT quotes_discount_limit CHECK (discount_cents <= subtotal_cents)
);

CREATE TABLE quote_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id       UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    service_id     UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    qty_sessions   INTEGER NOT NULL DEFAULT 1 CHECK (qty_sessions > 0),
    unit_cents     BIGINT NOT NULL CHECK (unit_cents >= 0),
    discount_cents BIGINT NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
    total_cents    BIGINT NOT NULL CHECK (total_cents >= 0),
    item_status    TEXT NOT NULL DEFAULT 'pending'
        CHECK (item_status IN ('pending','approved','refused'))
);

CREATE TABLE quote_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id   UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- created, sent, edited, approved, refused, expired, converted
    payload    JSONB NOT NULL DEFAULT '{}',
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7. Vendas (contrato — gera receita diferida quando pacote)
-- ---------------------------------------------------------------------------
CREATE TABLE sales (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    quote_id       UUID REFERENCES quotes(id) ON DELETE RESTRICT,
    patient_id     UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    kind           TEXT NOT NULL DEFAULT 'single'
        CHECK (kind IN ('single','package')),
    status         TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','completed','cancelled','refunded')),
    total_cents    BIGINT NOT NULL CHECK (total_cents >= 0),
    deposit_cents  BIGINT NOT NULL DEFAULT 0 CHECK (deposit_cents >= 0),
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at   TIMESTAMPTZ,
    cancelled_reason TEXT,
    CONSTRAINT sales_deposit_limit CHECK (deposit_cents <= total_cents)
);

CREATE TABLE sale_items (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id              UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    service_id           UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    qty_sessions         INTEGER NOT NULL DEFAULT 1 CHECK (qty_sessions > 0),
    unit_cents           BIGINT NOT NULL CHECK (unit_cents >= 0),
    total_cents          BIGINT NOT NULL CHECK (total_cents >= 0),
    sessions_done        INTEGER NOT NULL DEFAULT 0 CHECK (sessions_done >= 0),
    revenue_recognized_cents BIGINT NOT NULL DEFAULT 0 CHECK (revenue_recognized_cents >= 0),
    CONSTRAINT sale_items_sessions_limit CHECK (sessions_done <= qty_sessions),
    CONSTRAINT sale_items_revenue_limit CHECK (revenue_recognized_cents <= total_cents)
);

-- ---------------------------------------------------------------------------
-- 8. Recebíveis (títulos por parcela)
-- ---------------------------------------------------------------------------
CREATE TABLE receivables (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    sale_id     UUID REFERENCES sales(id) ON DELETE RESTRICT,
    patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    seq         INTEGER NOT NULL DEFAULT 1,
    due_date    DATE NOT NULL,
    amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
    paid_cents  BIGINT NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
    status      TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open','partial','paid','overdue','renegotiated','written_off')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at     TIMESTAMPTZ,
    CONSTRAINT receivables_paid_limit CHECK (paid_cents <= amount_cents)
);

-- ---------------------------------------------------------------------------
-- 9. Pagamentos (baixas com taxa)
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    receivable_id UUID REFERENCES receivables(id) ON DELETE RESTRICT,
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    fee_cents    BIGINT NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
    net_cents    BIGINT NOT NULL DEFAULT 0,      -- amount - fee
    method       TEXT NOT NULL CHECK (method IN ('pix','debit','credit','cash','transfer','boleto')),
    gateway_txid TEXT,                           -- ID da transação no PSP
    paid_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    conciliated_at TIMESTAMPTZ,
    notes        TEXT
);

-- ---------------------------------------------------------------------------
-- 10. Contas a pagar
-- ---------------------------------------------------------------------------
CREATE TABLE payables (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    supplier    TEXT NOT NULL,
    category    TEXT,
    due_date    DATE NOT NULL,
    amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
    paid_cents  BIGINT NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
    status      TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open','partial','paid','overdue','cancelled')),
    recurrence  TEXT,                               -- 'monthly', 'quarterly', etc.
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at     TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- 11. Caixa diário (conferência cega)
-- ---------------------------------------------------------------------------
CREATE TABLE cash_sessions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    opened_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at        TIMESTAMPTZ,
    opened_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    closed_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    expected_cents   BIGINT NOT NULL DEFAULT 0,
    informed_cents   BIGINT NOT NULL DEFAULT 0,
    difference_cents BIGINT NOT NULL DEFAULT 0,   -- informed - expected
    status           TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open','closed','reopened'))
);

-- ---------------------------------------------------------------------------
-- 12. Agenda
-- ---------------------------------------------------------------------------
CREATE TABLE appointments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    professional_id   UUID NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
    service_id        UUID REFERENCES services(id) ON DELETE SET NULL,
    sale_item_id      UUID REFERENCES sale_items(id) ON DELETE SET NULL, -- sessão de pacote
    starts_at         TIMESTAMPTZ NOT NULL,
    duration_min      INTEGER NOT NULL DEFAULT 60 CHECK (duration_min > 0),
    status            TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled','confirmed','checked_in','in_progress','completed','no_show','cancelled')),
    confirmation_sent BOOLEAN NOT NULL DEFAULT false,
    no_show_fee_applied BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT appointments_no_overlap EXCLUDE USING gist (
        professional_id WITH =,
        tsrange(starts_at, starts_at + (duration_min || ' minutes')::interval) WITH &&
    )
);

-- ---------------------------------------------------------------------------
-- 13. Atendimentos (prontuário — imutável após fechamento)
-- ---------------------------------------------------------------------------
CREATE TABLE encounters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
    service_id      UUID REFERENCES services(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open','closed')),
    notes           TEXT,
    opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at       TIMESTAMPTZ,
    closed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    prescription    BOOLEAN NOT NULL DEFAULT false,    -- receituário sujeito a retenção
    lot_trace_id    TEXT                               -- referência para rastreio sanitário
);

CREATE TABLE encounter_materials (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    product_id   UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    lot_id       UUID REFERENCES stock_lots(id) ON DELETE SET NULL,
    qty          NUMERIC(10,4) NOT NULL CHECK (qty > 0),
    cost_cents   BIGINT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 14. Receitas reconhecidas e comissões (competência)
-- ---------------------------------------------------------------------------
CREATE TABLE revenue_entries (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    encounter_id   UUID REFERENCES encounters(id) ON DELETE SET NULL,
    sale_item_id   UUID REFERENCES sale_items(id) ON DELETE SET NULL,
    amount_cents   BIGINT NOT NULL CHECK (amount_cents > 0),
    period         TEXT NOT NULL,                   -- 'YYYY-MM'
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE commission_rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
    scope       TEXT NOT NULL CHECK (scope IN ('service','category','product','all')),
    target_id   UUID,                               -- service/category/product id quando scope != all
    base        TEXT NOT NULL CHECK (base IN ('sold','received','executed')),
    pct         NUMERIC(5,2) NOT NULL CHECK (pct >= 0),
    valid_from  DATE NOT NULL,
    valid_until DATE,
    active      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE commission_entries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    professional_id  UUID NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
    sale_item_id     UUID REFERENCES sale_items(id) ON DELETE SET NULL,
    encounter_id     UUID REFERENCES encounters(id) ON DELETE SET NULL,
    payment_id       UUID REFERENCES payments(id) ON DELETE SET NULL,
    base_cents       BIGINT NOT NULL CHECK (base_cents >= 0),
    amount_cents     BIGINT NOT NULL CHECK (amount_cents >= 0),
    period           TEXT NOT NULL,                   -- 'YYYY-MM'
    status           TEXT NOT NULL DEFAULT 'to_pay'
        CHECK (status IN ('to_pay','paid','reversed')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at          TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- 15. Fiscal (NFS-e)
-- ---------------------------------------------------------------------------
CREATE TABLE invoices (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    sale_id          UUID REFERENCES sales(id) ON DELETE RESTRICT,
    number           TEXT NOT NULL,                 -- numeração da prefeitura
    series           TEXT,
    verification_code TEXT UNIQUE,
    status           TEXT NOT NULL DEFAULT 'issued'
        CHECK (status IN ('issued','cancelled','replaced')),
    issuer_code      TEXT,                          -- código do prestador na prefeitura
    service_code     TEXT,                          -- código de serviço municipal
    issuer_name      TEXT,
    tomador_cpf_cnpj TEXT,
    amount_cents     BIGINT NOT NULL CHECK (amount_cents >= 0),
    iss_cents        BIGINT NOT NULL DEFAULT 0,
    xml_url          TEXT,
    pdf_url          TEXT,
    issued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at     TIMESTAMPTZ,
    cancelled_reason TEXT
);

-- ---------------------------------------------------------------------------
-- 16. Relacionamento / recall / NPS
-- ---------------------------------------------------------------------------
CREATE TABLE recall_tasks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    reason      TEXT NOT NULL,                       -- toxina 120d, preenchimento 12m, etc.
    due_date    DATE NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','contacted','done','cancelled')),
    channel     TEXT,                                -- whatsapp, phone, email
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    patient_id  UUID REFERENCES patients(id) ON DELETE SET NULL,
    channel     TEXT NOT NULL CHECK (channel IN ('whatsapp','email','sms')),
    template    TEXT,
    status      TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','sent','delivered','read','failed')),
    sent_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE nps_responses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    patient_id  UUID REFERENCES patients(id) ON DELETE SET NULL,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    score       INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 17. Auditoria imutável e anexos
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    entity       TEXT NOT NULL,
    entity_id    UUID NOT NULL,
    action       TEXT NOT NULL, -- create, update, delete, close, reopen
    before_value JSONB,
    after_value  JSONB,
    ip_address   INET,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attachments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    entity       TEXT NOT NULL,
    entity_id    UUID NOT NULL,
    file_name    TEXT NOT NULL,
    storage_key  TEXT NOT NULL,                     -- chave no S3/R2
    mime_type    TEXT NOT NULL,
    size_bytes   BIGINT NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- ÍNDICES DE DESEMPENHO
-- ============================================================================
CREATE INDEX idx_tenants_active ON tenants(active);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX idx_patients_tenant ON patients(tenant_id);
CREATE INDEX idx_patients_cpf ON patients(cpf);
CREATE INDEX idx_patients_active ON patients(active);
CREATE INDEX idx_patients_name_trgm ON patients USING gin(name gin_trgm_ops); -- precisa pg_trgm

CREATE INDEX idx_professionals_tenant ON professionals(tenant_id);
CREATE INDEX idx_professionals_active ON professionals(active);

CREATE INDEX idx_services_tenant ON services(tenant_id);
CREATE INDEX idx_services_active ON services(active);

CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_active ON products(active);

CREATE INDEX idx_stock_lots_product ON stock_lots(product_id);
CREATE INDEX idx_stock_lots_expires ON stock_lots(expires_on) WHERE active;
CREATE INDEX idx_stock_moves_product ON stock_moves(product_id);
CREATE INDEX idx_stock_moves_created ON stock_moves(created_at);
CREATE INDEX idx_stock_moves_encounter ON stock_moves(encounter_id);

CREATE INDEX idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX idx_quotes_number ON quotes(tenant_id, number);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_patient ON quotes(patient_id);
CREATE INDEX idx_quotes_valid_until ON quotes(valid_until) WHERE status IN ('sent','negotiation');

CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX idx_quote_events_quote ON quote_events(quote_id);

CREATE INDEX idx_sales_tenant ON sales(tenant_id);
CREATE INDEX idx_sales_quote ON sales(quote_id);
CREATE INDEX idx_sales_patient ON sales(patient_id);
CREATE INDEX idx_sales_created ON sales(created_at);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_service ON sale_items(service_id);

CREATE INDEX idx_receivables_tenant ON receivables(tenant_id);
CREATE INDEX idx_receivables_sale ON receivables(sale_id);
CREATE INDEX idx_receivables_patient ON receivables(patient_id);
CREATE INDEX idx_receivables_status_due ON receivables(status, due_date);
CREATE INDEX idx_receivables_overdue ON receivables(due_date) WHERE status NOT IN ('paid','cancelled','written_off');

CREATE INDEX idx_payments_receivable ON payments(receivable_id);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);

CREATE INDEX idx_payables_tenant ON payables(tenant_id);
CREATE INDEX idx_payables_status_due ON payables(status, due_date);

CREATE INDEX idx_cash_sessions_tenant ON cash_sessions(tenant_id);
CREATE INDEX idx_cash_sessions_status ON cash_sessions(status);

CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_professional_time ON appointments(professional_id, starts_at);
CREATE INDEX idx_appointments_status ON appointments(status);

CREATE INDEX idx_encounters_tenant ON encounters(tenant_id);
CREATE INDEX idx_encounters_patient ON encounters(patient_id);
CREATE INDEX idx_encounters_status ON encounters(status);
CREATE INDEX idx_encounters_opened ON encounters(opened_at);

CREATE INDEX idx_encounter_materials_encounter ON encounter_materials(encounter_id);
CREATE INDEX idx_encounter_materials_product ON encounter_materials(product_id);
CREATE INDEX idx_encounter_materials_lot ON encounter_materials(lot_id);

CREATE INDEX idx_revenue_entries_tenant ON revenue_entries(tenant_id);
CREATE INDEX idx_revenue_entries_period ON revenue_entries(period);
CREATE INDEX idx_revenue_entries_sale_item ON revenue_entries(sale_item_id);

CREATE INDEX idx_commission_entries_tenant ON commission_entries(tenant_id);
CREATE INDEX idx_commission_entries_professional_period ON commission_entries(professional_id, period);
CREATE INDEX idx_commission_entries_status ON commission_entries(status);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_sale ON invoices(sale_id);
CREATE INDEX idx_invoices_number ON invoices(number);
CREATE INDEX idx_invoices_verification ON invoices(verification_code);

CREATE INDEX idx_recall_tasks_tenant ON recall_tasks(tenant_id);
CREATE INDEX idx_recall_tasks_patient ON recall_tasks(patient_id);
CREATE INDEX idx_recall_tasks_due ON recall_tasks(due_date) WHERE status = 'pending';

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_status ON notifications(status);

CREATE INDEX idx_audit_log_entity ON audit_log(entity, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

CREATE INDEX idx_attachments_entity ON attachments(entity, entity_id);

-- ============================================================================
-- VIEWS DE RELATÓRIO (produção: leitura otimizada)
-- ============================================================================

-- DRE gerencial por mês
CREATE OR REPLACE VIEW v_dre_monthly AS
SELECT
    r.period,
    SUM(r.amount_cents) AS revenue_recognized_cents,
    COALESCE(SUM(i.amount_cents), 0) - COALESCE(SUM(i.iss_cents), 0) AS gross_service_cents,
    COALESCE(SUM(sm.cost_cents), 0) AS materials_cents,
    COALESCE(SUM(ce.amount_cents), 0) AS commissions_cents
FROM revenue_entries r
LEFT JOIN invoices i ON i.sale_id = (SELECT sale_id FROM sale_items si2 WHERE si2.id = r.sale_item_id LIMIT 1)
LEFT JOIN sale_items si ON si.id = r.sale_item_id
LEFT JOIN stock_moves sm ON sm.encounter_id = r.encounter_id AND sm.kind = 'out'
LEFT JOIN commission_entries ce ON ce.sale_item_id = r.sale_item_id AND ce.period = r.period
GROUP BY r.period
ORDER BY r.period;

-- Receita a reconhecer (passivo de pacotes)
CREATE OR REPLACE VIEW v_revenue_deferred AS
SELECT
    s.id AS sale_id,
    s.patient_id,
    s.total_cents,
    COALESCE(SUM(si.revenue_recognized_cents), 0) AS recognized_cents,
    (s.total_cents - COALESCE(SUM(si.revenue_recognized_cents), 0)) AS deferred_cents,
    COUNT(si.id) AS total_sessions,
    SUM(si.sessions_done) AS done_sessions
FROM sales s
JOIN sale_items si ON si.sale_id = s.id
WHERE s.status = 'active'
GROUP BY s.id, s.patient_id, s.total_cents;

-- Funil de orçamentos
CREATE OR REPLACE VIEW v_quote_funnel AS
SELECT
    status,
    COUNT(*) AS count,
    SUM(total_cents) AS total_cents
FROM quotes
GROUP BY status;

-- Estoque abaixo do mínimo / vencendo
CREATE OR REPLACE VIEW v_stock_alerts AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.unit,
    p.min_stock,
    COALESCE(SUM(l.qty), 0) AS stock_qty,
    l.id AS lot_id,
    l.lot_code,
    l.expires_on,
    CASE
        WHEN l.expires_on < CURRENT_DATE THEN 'expired'
        WHEN l.expires_on <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'ok'
    END AS lot_status,
    CASE
        WHEN COALESCE(SUM(l.qty), 0) <= p.min_stock THEN 'below_min'
        ELSE 'ok'
    END AS stock_status
FROM products p
LEFT JOIN stock_lots l ON l.product_id = p.id AND l.active
WHERE p.active
GROUP BY p.id, p.name, p.unit, p.min_stock, l.id, l.lot_code, l.expires_on;

-- ============================================================================
-- TRIGGERS DE AUDITORIA E IMUTABILIDADE
-- ============================================================================

-- Função de auditoria genérica
CREATE OR REPLACE FUNCTION fn_audit_log() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (tenant_id, user_id, entity, entity_id, action, before_value, after_value, ip_address, created_at)
    VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        NULL, -- user_id preenchido pela aplicação no contexto da sessão
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE
            WHEN TG_OP = 'DELETE' THEN 'delete'
            WHEN TG_OP = 'INSERT' THEN 'create'
            ELSE 'update'
        END,
        CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END,
        NULL,
        now()
    );
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparar auditoria nas tabelas críticas
DO $$
DECLARE tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      AND tablename IN (
        'patients','professionals','services','products','stock_lots','quotes',
        'quote_items','sales','sale_items','receivables','payables','payments',
        'appointments','encounters','commission_entries','revenue_entries','invoices'
    )
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_audit_%I BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fn_audit_log();',
            tbl, tbl
        );
    END LOOP;
END $$;

-- Impedir edição de atendimento fechado (prontuário imutável)
CREATE OR REPLACE FUNCTION fn_encounter_immutable() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'closed' AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'Encounter % is closed and immutable. Use an addendum.', OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_encounter_immutable BEFORE UPDATE ON encounters
FOR EACH ROW EXECUTE FUNCTION fn_encounter_immutable();

-- Impedir edição de receita reconhecida lançada
CREATE OR REPLACE FUNCTION fn_revenue_entry_immutable() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Revenue entry % is immutable. Reverse via a new entry.', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_revenue_entry_immutable BEFORE UPDATE OR DELETE ON revenue_entries
FOR EACH ROW EXECUTE FUNCTION fn_revenue_entry_immutable();

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION fn_update_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      AND tablename IN (
        'tenants','users','professionals','patients','services','products',
        'stock_lots','quotes','sales','appointments','encounters','payables'
    )
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_updated_at_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();',
            tbl, tbl
        );
    END LOOP;
END $$;

-- Comentários de documentação
COMMENT ON TABLE tenants IS 'Clínica / unidade. Multi-tenant desde o dia 1.';
COMMENT ON TABLE patients IS 'Dados sensíveis (LGPD). Exclusão lógica apenas.';
COMMENT ON TABLE quotes IS 'Documento central do funil comercial. Versionado.';
COMMENT ON TABLE sales IS 'Contrato de venda. Gera receita diferida quando pacote.';
COMMENT ON TABLE revenue_entries IS 'Receita reconhecida por execução (competência).';
COMMENT ON TABLE encounters IS 'Prontuário. Imutável após fechamento.';
COMMENT ON TABLE stock_lots IS 'Rastreabilidade sanitária: paciente → lote → fornecedor.';

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
