-- Run this in your Supabase SQL Editor to create the job_opportunities table

CREATE TABLE IF NOT EXISTS job_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(100) NOT NULL,
  job_title VARCHAR(150) NOT NULL,
  role_type VARCHAR(50) DEFAULT 'Full-time',
  deadline TIMESTAMP WITH TIME ZONE,
  is_genuine BOOLEAN DEFAULT TRUE,
  trust_score INTEGER DEFAULT 85,
  trust_reasons TEXT[] DEFAULT '{}',
  apply_url TEXT,
  apply_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'detected',
  reminder_set BOOLEAN DEFAULT TRUE,
  ai_cover_letter TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_opps_user ON job_opportunities(user_id, status);
CREATE INDEX IF NOT EXISTS idx_job_opps_deadline ON job_opportunities(deadline);
