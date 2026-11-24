ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS roles_organization_name_idx
    ON roles (organization_id, name);

CREATE TABLE IF NOT EXISTS account_challenges (
    purpose VARCHAR(20) NOT NULL,
    account_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    otp_digest TEXT NOT NULL,
    attempts_remaining INTEGER NOT NULL CHECK (attempts_remaining >= 0),
    resend_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    reset_digest TEXT,
    PRIMARY KEY (purpose, account_id)
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    account_name VARCHAR(150) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    accoount_number_encrypted TEXT,
    ifsc VARCHAR(11),
    ledger_account_id UUID NOT NULL REFERENCES charts_of_accounts(id),
    CONSTRAINT valid_ifsc_code
        CHECK (ifsc IS NULL OR UPPER(ifsc) ~ '^[A-Z]{4}0[A-Z0-9]{6}$')
);

ALTER TABLE branches ADD COLUMN IF NOT EXISTS pan VARCHAR(10)
    CHECK (pan IS NULL OR pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$');
