-- Prevent multiple open settlements for the same payment_attempt_id
-- Adds a partial unique index on payment_attempt_id when not null so
-- INSERT ... ON CONFLICT can be used by the application to dedupe.

-- Create a partial unique index on payment_attempt_id when not null
-- so INSERT ... ON CONFLICT can be used by the application to dedupe.
CREATE UNIQUE INDEX IF NOT EXISTS settlements_payment_attempt_unique ON settlements(payment_attempt_id) WHERE payment_attempt_id IS NOT NULL;
