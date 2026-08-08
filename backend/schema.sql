-- AIVOA Pharmaceutical QMS - PostgreSQL / MySQL Schema
-- Stores Customer Complaint records, Audit Trails, and CAPA Recommendations

CREATE TABLE IF NOT EXISTS qms_complaints (
    qms_log_id VARCHAR(50) PRIMARY KEY,
    complaint_source VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_strength VARCHAR(100),
    batch_lot_number VARCHAR(100) NOT NULL,
    affected_quantity VARCHAR(100),
    manufacturing_date DATE,
    expiry_date DATE,
    originating_site_block VARCHAR(255),
    impacted_npm VARCHAR(255),
    complaint_category VARCHAR(100),
    complaint_description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending Triage',
    severity_suggested VARCHAR(50),
    suggested_next_action TEXT,
    initial_risk_assessment TEXT,
    committed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qms_audit_trail (
    id SERIAL PRIMARY KEY,
    qms_log_id VARCHAR(50) REFERENCES qms_complaints(qms_log_id),
    action VARCHAR(100) NOT NULL,
    changed_by VARCHAR(100) DEFAULT 'AIVOA Copilot (LangGraph)',
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qms_capa_logs (
    capa_id VARCHAR(50) PRIMARY KEY,
    qms_log_id VARCHAR(50) REFERENCES qms_complaints(qms_log_id),
    immediate_containment TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    risk_matrix_score VARCHAR(50),
    completeness_score INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
