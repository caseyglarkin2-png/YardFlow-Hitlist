-- Add optimized indexes for performance (Sprint 22.4)
-- Converted from Prisma field names to actual database column names (snake_case)

-- Outreach table indexes for filtering and sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outreach_status ON outreach(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outreach_channel ON outreach(channel);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outreach_sent ON outreach(sent_at DESC) WHERE sent_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outreach_opened ON outreach(opened_at) WHERE opened_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outreach_responded ON outreach(responded_at) WHERE responded_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outreach_campaign_status ON outreach(campaign_id, status);

-- Person table indexes for filtering by persona
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_account_exec ON people(account_id, is_exec_ops) WHERE is_exec_ops = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_ops ON people(is_ops) WHERE is_ops = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_proc ON people(is_proc) WHERE is_proc = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_sales ON people(is_sales) WHERE is_sales = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_email ON people(email) WHERE email IS NOT NULL;

-- TargetAccount indexes for sorting and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_event_icp ON target_accounts(event_id, icp_score DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_icp_score ON target_accounts(icp_score DESC NULLS LAST);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_name_search ON target_accounts USING gin (to_tsvector('english', name));

-- Campaign indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_event_status ON campaigns(event_id, status);

-- Meeting indexes for scheduling queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meetings_scheduled ON meetings(scheduled_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meetings_person_status ON meetings(person_id, status);

-- CompanyDossier index for freshness check
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dossiers_researched ON company_dossiers(researched_at DESC);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outreach_person_channel_status ON outreach(person_id, channel, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_account_email ON people(account_id, email);
