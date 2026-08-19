-- ==============================================================================
-- BRICS-AETHER: Sovereign Disputes & Cloud Tasks Ledger Schema
-- File: agentic_routing/disputes_schema.sql
-- Compatible: Google Cloud SQL (PostgreSQL 15+) & CockroachDB / BigQuery Federation
-- ==============================================================================

-- 1. Sovereign Dossiers Table (Immutable T0 records)
CREATE TABLE IF NOT EXISTS sovereign_dossiers (
    dossier_id VARCHAR(64) PRIMARY KEY,
    plume_id VARCHAR(64) NOT NULL,
    h3_res8 VARCHAR(20) NOT NULL,
    nation VARCHAR(4) NOT NULL,
    state VARCHAR(64) NOT NULL,
    district VARCHAR(64) NOT NULL,
    escalation_level INT NOT NULL DEFAULT 1, -- 1 to 5
    t0_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sla_deadline TIMESTAMPTZ NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    dossier_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dossiers_h3 ON sovereign_dossiers (h3_res8);
CREATE INDEX IF NOT EXISTS idx_dossiers_sha ON sovereign_dossiers (sha256_hash);
CREATE INDEX IF NOT EXISTS idx_dossiers_nation_state ON sovereign_dossiers (nation, state);

-- 2. Disputes Table (Lifecycle, mediation & escalation state)
CREATE TABLE IF NOT EXISTS disputes (
    dispute_id VARCHAR(64) PRIMARY KEY,
    alert_id VARCHAR(64) NOT NULL,
    dossier_id VARCHAR(64) REFERENCES sovereign_dossiers(dossier_id),
    h3_res8 VARCHAR(20) NOT NULL,
    filing_nation VARCHAR(4) NOT NULL,
    filing_state VARCHAR(64) NOT NULL,
    filing_district VARCHAR(64) NOT NULL,
    respondent_district VARCHAR(64) NOT NULL,
    primary_owner_district VARCHAR(64) NOT NULL,
    dispute_reason VARCHAR(128) NOT NULL,
    counter_evidence TEXT,
    escalation_level INT NOT NULL DEFAULT 1, -- 1: Intra, 2: Inter-Dist, 3: Inter-State, 4: Bilateral, 5: BEDC
    status VARCHAR(32) NOT NULL DEFAULT 'MEDIATING', -- MEDIATING, ESCALATED, RESOLVED, BINDING_ISSUED
    filed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sla_deadline TIMESTAMPTZ NOT NULL,
    tier_clock_label VARCHAR(64) NOT NULL,
    sha256_evidence_hash CHAR(64) NOT NULL,
    tee_enclave_attestation VARCHAR(256),
    resolution_memo TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);
CREATE INDEX IF NOT EXISTS idx_disputes_deadline ON disputes (sla_deadline);
CREATE INDEX IF NOT EXISTS idx_disputes_level ON disputes (escalation_level);

-- 3. Dispute Audit Trail & Escalation Events Table
CREATE TABLE IF NOT EXISTS dispute_audit_events (
    event_id SERIAL PRIMARY KEY,
    dispute_id VARCHAR(64) NOT NULL REFERENCES disputes(dispute_id) ON DELETE CASCADE,
    previous_level INT,
    new_level INT,
    event_type VARCHAR(64) NOT NULL, -- FILED, CLOCK_TICK, AUTO_ESCALATED, TEE_AUDITED, RESOLVED
    event_payload JSONB,
    actor VARCHAR(64) NOT NULL DEFAULT 'CLOUD_TASKS_WORKER',
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_dispute ON dispute_audit_events (dispute_id);
