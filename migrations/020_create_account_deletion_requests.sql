-- Create account_deletion_requests table
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_account_deletion_requests_email ON account_deletion_requests(email);
CREATE INDEX idx_account_deletion_requests_user_id ON account_deletion_requests(user_id);
CREATE INDEX idx_account_deletion_requests_status ON account_deletion_requests(status);
CREATE INDEX idx_account_deletion_requests_expires_at ON account_deletion_requests(expires_at);

-- Add RLS policies for security
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own deletion requests
CREATE POLICY "Users can view their own deletion requests"
  ON account_deletion_requests
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Service role can view all deletion requests (for admin/cron jobs)
CREATE POLICY "Service role can view all deletion requests"
  ON account_deletion_requests
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Comment for documentation
COMMENT ON TABLE account_deletion_requests IS 'Tracks account deletion requests for GDPR compliance. Used for account deletion workflow.';
