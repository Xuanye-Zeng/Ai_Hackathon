-- MedTriage Agent — Database Schema
-- Run via: npx @insforge/cli db query "$(cat db/schema.sql)"

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  symptoms_raw TEXT NOT NULL,
  summary_json JSONB,
  triage_score INTEGER CHECK (triage_score BETWEEN 1 AND 5),
  triage_reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'scheduled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID,
  case_id UUID REFERENCES cases(id),
  time_slot TIMESTAMPTZ NOT NULL,
  priority INTEGER,
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
