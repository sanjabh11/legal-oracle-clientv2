-- Compliance Framework Database Schema
-- Phase 3A: Compliance Optimization Infrastructure

-- Compliance frameworks table (GDPR, SOX, HIPAA, CCPA, etc.)
CREATE TABLE IF NOT EXISTS compliance_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_code VARCHAR(50) UNIQUE NOT NULL,
  framework_name TEXT NOT NULL,
  description TEXT,
  jurisdiction TEXT,
  industry TEXT[],
  effective_date DATE,
  last_updated DATE,
  compliance_level VARCHAR(50), -- 'mandatory', 'recommended', 'industry_standard'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance controls table (specific requirements)
CREATE TABLE IF NOT EXISTS compliance_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_code VARCHAR(100) UNIQUE NOT NULL,
  framework_id UUID REFERENCES compliance_frameworks(id),
  control_title TEXT NOT NULL,
  description TEXT,
  priority VARCHAR(10), -- P1, P2, P3
  estimated_cost NUMERIC(10,2),
  implementation_timeline_days INTEGER,
  control_category VARCHAR(100), -- 'data_protection', 'financial_reporting', 'security', etc.
  requirements TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Industry-framework mapping
CREATE TABLE IF NOT EXISTS industry_compliance_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry VARCHAR(100) NOT NULL,
  jurisdiction VARCHAR(100),
  framework_id UUID REFERENCES compliance_frameworks(id),
  applicability_score DECIMAL(3,2), -- 0.00 to 1.00
  mandatory BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop and recreate strategic_patterns table with correct schema
DROP TABLE IF EXISTS strategic_patterns CASCADE;

-- Strategic patterns table (for game theory)
CREATE TABLE strategic_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  case_type TEXT,
  jurisdiction TEXT,
  strategy_type VARCHAR(100),
  success_rate DECIMAL(4,3),
  sample_size INTEGER,
  conditions JSONB,
  recommendations TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_jurisdiction ON compliance_frameworks(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_industry ON compliance_frameworks USING GIN(industry);
CREATE INDEX IF NOT EXISTS idx_compliance_controls_framework ON compliance_controls(framework_id);
CREATE INDEX IF NOT EXISTS idx_compliance_controls_category ON compliance_controls(control_category);
CREATE INDEX IF NOT EXISTS idx_industry_compliance_industry ON industry_compliance_map(industry);
CREATE INDEX IF NOT EXISTS idx_strategic_patterns_case_type ON strategic_patterns(case_type);

-- Seed compliance frameworks
INSERT INTO compliance_frameworks (framework_code, framework_name, description, jurisdiction, industry, effective_date, compliance_level, metadata) VALUES
  ('GDPR', 'General Data Protection Regulation', 'EU data protection and privacy regulation', 'EU', ARRAY['technology', 'healthcare', 'finance', 'retail'], '2018-05-25', 'mandatory', '{"regions": ["EU", "EEA"], "penalties": "up to 4% of global revenue"}'),
  ('CCPA', 'California Consumer Privacy Act', 'California consumer privacy law', 'California', ARRAY['technology', 'retail', 'marketing'], '2020-01-01', 'mandatory', '{"scope": "businesses with CA consumers", "penalties": "$2,500-$7,500 per violation"}'),
  ('SOX', 'Sarbanes-Oxley Act', 'Financial reporting and corporate governance', 'Federal', ARRAY['finance', 'corporate'], '2002-07-30', 'mandatory', '{"applies_to": "public companies", "sections": [302, 404, 409, 802, 906]}'),
  ('HIPAA', 'Health Insurance Portability and Accountability Act', 'Healthcare data privacy and security', 'Federal', ARRAY['healthcare', 'insurance'], '1996-08-21', 'mandatory', '{"protected_data": "PHI", "penalties": "$100-$50,000 per violation"}'),
  ('PCI-DSS', 'Payment Card Industry Data Security Standard', 'Credit card data security', 'Global', ARRAY['retail', 'finance', 'ecommerce'], '2004-12-15', 'industry_standard', '{"card_brands": ["Visa", "Mastercard", "Amex"], "levels": [1,2,3,4]}'),
  ('ISO-27001', 'Information Security Management System', 'International security standard', 'Global', ARRAY['technology', 'finance', 'healthcare'], '2013-10-01', 'recommended', '{"certification": "optional but recommended", "scope": "ISMS"}')
ON CONFLICT (framework_code) DO UPDATE SET
  framework_name = EXCLUDED.framework_name,
  last_updated = NOW();

-- Seed compliance controls for GDPR
INSERT INTO compliance_controls (control_code, framework_id, control_title, description, priority, estimated_cost, implementation_timeline_days, control_category, requirements) VALUES
  ('GDPR-001', (SELECT id FROM compliance_frameworks WHERE framework_code = 'GDPR'), 'Data Mapping and Inventory', 'Complete inventory of personal data processing activities', 'P1', 25000, 90, 'data_protection', ARRAY['Document all data flows', 'Identify data categories', 'Map third-party processors']),
  ('GDPR-002', (SELECT id FROM compliance_frameworks WHERE framework_code = 'GDPR'), 'Consent Management System', 'Implement explicit consent mechanisms', 'P1', 35000, 120, 'data_protection', ARRAY['Granular consent options', 'Easy withdrawal mechanism', 'Consent records audit trail']),
  ('GDPR-003', (SELECT id FROM compliance_frameworks WHERE framework_code = 'GDPR'), 'Data Subject Rights Portal', 'Enable access, rectification, erasure rights', 'P1', 45000, 150, 'data_protection', ARRAY['Automated request handling', 'Identity verification', '30-day response SLA']),
  ('GDPR-004', (SELECT id FROM compliance_frameworks WHERE framework_code = 'GDPR'), 'Privacy Impact Assessments', 'Conduct DPIAs for high-risk processing', 'P2', 15000, 60, 'risk_management', ARRAY['Risk assessment templates', 'Mitigation strategies', 'Documentation procedures']),
  ('GDPR-005', (SELECT id FROM compliance_frameworks WHERE framework_code = 'GDPR'), 'Breach Notification System', 'Implement 72-hour breach notification', 'P1', 20000, 90, 'incident_response', ARRAY['Detection mechanisms', 'Notification templates', 'Regulatory reporting workflow'])
ON CONFLICT (control_code) DO NOTHING;

-- Seed compliance controls for SOX
INSERT INTO compliance_controls (control_code, framework_id, control_title, description, priority, estimated_cost, implementation_timeline_days, control_category, requirements) VALUES
  ('SOX-302', (SELECT id FROM compliance_frameworks WHERE framework_code = 'SOX'), 'CEO/CFO Certifications', 'Executive certification of financial reports', 'P1', 10000, 45, 'financial_reporting', ARRAY['Quarterly certification process', 'Internal controls review', 'Disclosure controls assessment']),
  ('SOX-404', (SELECT id FROM compliance_frameworks WHERE framework_code = 'SOX'), 'Internal Controls Assessment', 'Annual internal controls audit', 'P1', 150000, 365, 'financial_reporting', ARRAY['COSO framework implementation', 'Control testing', 'External auditor attestation']),
  ('SOX-409', (SELECT id FROM compliance_frameworks WHERE framework_code = 'SOX'), 'Real-Time Disclosure', 'Rapid disclosure of material changes', 'P2', 25000, 90, 'disclosure', ARRAY['Monitoring system', 'Materiality assessment', '4-day disclosure window']),
  ('SOX-802', (SELECT id FROM compliance_frameworks WHERE framework_code = 'SOX'), 'Document Retention Policy', 'Maintain audit records for 7 years', 'P2', 30000, 120, 'records_management', ARRAY['Document classification', 'Secure storage', 'Destruction procedures'])
ON CONFLICT (control_code) DO NOTHING;

-- Seed compliance controls for HIPAA
INSERT INTO compliance_controls (control_code, framework_id, control_title, description, priority, estimated_cost, implementation_timeline_days, control_category, requirements) VALUES
  ('HIPAA-164.308', (SELECT id FROM compliance_frameworks WHERE framework_code = 'HIPAA'), 'Administrative Safeguards', 'Security management processes', 'P1', 40000, 120, 'security', ARRAY['Risk analysis', 'Risk management', 'Workforce training']),
  ('HIPAA-164.310', (SELECT id FROM compliance_frameworks WHERE framework_code = 'HIPAA'), 'Physical Safeguards', 'Facility access controls', 'P1', 25000, 90, 'security', ARRAY['Facility security plan', 'Workstation security', 'Device and media controls']),
  ('HIPAA-164.312', (SELECT id FROM compliance_frameworks WHERE framework_code = 'HIPAA'), 'Technical Safeguards', 'Access controls and encryption', 'P1', 50000, 120, 'security', ARRAY['Unique user IDs', 'Encryption at rest and in transit', 'Audit controls']),
  ('HIPAA-164.316', (SELECT id FROM compliance_frameworks WHERE framework_code = 'HIPAA'), 'Policies and Procedures', 'Documentation requirements', 'P2', 15000, 60, 'governance', ARRAY['Policy documentation', 'Procedure updates', '6-year retention'])
ON CONFLICT (control_code) DO NOTHING;

-- Seed industry compliance mappings
INSERT INTO industry_compliance_map (industry, jurisdiction, framework_id, applicability_score, mandatory) VALUES
  ('technology', 'EU', (SELECT id FROM compliance_frameworks WHERE framework_code = 'GDPR'), 1.00, true),
  ('technology', 'California', (SELECT id FROM compliance_frameworks WHERE framework_code = 'CCPA'), 0.90, true),
  ('finance', 'Federal', (SELECT id FROM compliance_frameworks WHERE framework_code = 'SOX'), 1.00, true),
  ('healthcare', 'Federal', (SELECT id FROM compliance_frameworks WHERE framework_code = 'HIPAA'), 1.00, true),
  ('retail', 'Global', (SELECT id FROM compliance_frameworks WHERE framework_code = 'PCI-DSS'), 0.95, false),
  ('ecommerce', 'Global', (SELECT id FROM compliance_frameworks WHERE framework_code = 'PCI-DSS'), 1.00, false)
ON CONFLICT DO NOTHING;

-- Seed strategic patterns
INSERT INTO strategic_patterns (pattern_name, case_type, jurisdiction, strategy_type, success_rate, sample_size, recommendations) VALUES
  ('Early Settlement in Contract Disputes', 'contract_dispute', 'Federal', 'settlement', 0.725, 150, ARRAY['Initiate settlement talks within 30 days', 'Offer structured payments', 'Include confidentiality clause']),
  ('Aggressive Litigation in IP Cases', 'intellectual_property', 'Federal', 'litigation', 0.680, 95, ARRAY['File for preliminary injunction', 'Seek treble damages', 'Pursue attorney fees']),
  ('Mediation in Employment Disputes', 'employment', 'California', 'mediation', 0.810, 200, ARRAY['Select neutral mediator', 'Prepare settlement authority', 'Focus on non-monetary remedies']),
  ('Summary Judgment in Product Liability', 'product_liability', 'Delaware', 'dismissal', 0.450, 75, ARRAY['File early motion to dismiss', 'Challenge expert qualifications', 'Focus on preemption arguments'])
ON CONFLICT DO NOTHING;
