CREATE TABLE tenants (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE facilities (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  city text NOT NULL
);

CREATE TABLE patients (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id),
  display_name text NOT NULL,
  date_of_birth date,
  gender text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE visits (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id),
  facility_id text NOT NULL REFERENCES facilities(id),
  patient_id text NOT NULL REFERENCES patients(id),
  active_stage text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE journey_events (
  id bigserial PRIMARY KEY,
  visit_id text NOT NULL REFERENCES visits(id),
  stage text NOT NULL,
  owner_role text NOT NULL,
  status text NOT NULL,
  detail text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clinical_orders (
  id text PRIMARY KEY,
  visit_id text NOT NULL REFERENCES visits(id),
  order_type text NOT NULL,
  status text NOT NULL,
  ordered_by text NOT NULL,
  ordered_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE billing_lines (
  id bigserial PRIMARY KEY,
  visit_id text NOT NULL REFERENCES visits(id),
  label text NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  currency text NOT NULL DEFAULT 'INR'
);

CREATE TABLE audit_events (
  id bigserial PRIMARY KEY,
  tenant_id text NOT NULL,
  facility_id text NOT NULL,
  patient_id text,
  visit_id text,
  actor_user_id text,
  actor_role text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  correlation_id text,
  idempotency_key text,
  previous jsonb,
  next jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visits_patient ON visits(patient_id);
CREATE INDEX idx_journey_events_visit ON journey_events(visit_id, occurred_at DESC);
CREATE INDEX idx_audit_events_visit ON audit_events(visit_id, occurred_at DESC);
