-- Add optimized indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_event_icp ON target_accounts(event_id, icp_score DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_account_exec ON people(account_id, is_exec_ops) WHERE is_exec_ops = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outreach_sent ON outreach(sent_at DESC) WHERE sent_at IS NOT NULL;
