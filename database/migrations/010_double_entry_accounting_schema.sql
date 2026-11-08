DO $$
BEGIN
    CREATE TYPE charts_of_account_type AS ENUM (
        'asset',
        'liability',
        'equity',
        'income',
        'expense'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE charts_of_account_status_type AS ENUM (
        'active',
        'inactive'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE journal_entries_status_type AS ENUM (
        'draft',
        'posted',
        'reversed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE journal_lines_party_type AS ENUM (
        'customer',
        'supplier',
        'employee',
        'none'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE accounting_periods_status_type AS ENUM (
        'open',
        'closed',
        'locked'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE bank_accounts_status_type AS ENUM (
        'active',
        'inactive'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE bank_transactions_status_type AS ENUM (
        'unmatched',
        'matched',
        'reconciled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS charts_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    account_code VARCHAR(30) NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_type charts_of_account_type NOT NULL,
    is_control_account BOOLEAN NOT NULL,
    is_system_account BOOLEAN NOT NULL,
    status charts_of_account_status_type NOT NULL DEFAULT 'active',

    CONSTRAINT unique_account_code_per_organization
        UNIQUE (organization_id, account_code)
);

CREATE TABLE IF NOT EXISTS journal_entries(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    journal_number VARCHAR(50) NOT NULL,
    journal_date DATE NOT NULL,
    reference_type VARCHAR(50)
        CHECK (reference_type IN ('invoice', 'payment', 'invoice','etc')),
    reference_id UUID,
    description TEXT,
    status journal_entries_status_type NOT NULL DEFAULT 'posted',
    posted_by UUID REFERENCES users(id),
    posted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS journal_lines(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    debit DECIMAL(18,2) NOT NULL,
    credit DECIMAL(18,2) NOT NULL,
    description TEXT,
    party_type journal_lines_party_type,
    party_id UUID,
    booking_id UUID REFERENCES bookings(id),

    CONSTRAINT valid_debit CHECK (debit >= 0),
    CONSTRAINT valid_credit CHECK (credit >= 0)

);

CREATE TABLE IF NOT EXISTS accounting_periods(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status accounting_periods_status_type NOT NULL DEFAULT 'open',

    CONSTRAINT check_end_date CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS accounting_periods(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    account_name VARCHAR(150) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    accoount_number_encrypted TEXT,
    ifsc VARCHAR(11),
    ledger_account_id UUID NOT NULL,

    CONSTRAINT valid_ifsc_code
        CHECK ( ifsc_code IS NULL OR UPPER(ifsc_code) ~ '^[A-Z]{4}0[A-Z0-9]{6}$')
);

CREATE TABLE IF NOT EXISTS bank_transactions(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    reference_number VARCHAR(150),
    debit DECIMAL(18,2) NOT NULL,
    credit DECIMAL(18,2) NOT NULL,
    balance DECIMAL(18,2),
    reconcilition_status bank_transactions_status_type NOT NULL,

    CONSTRAINT valid_debit CHECK (debit >= 0),
    CONSTRAINT valid_credit CHECK (credit >= 0),
    CONSTRAINT valid_balance CHECK (balance >= 0)
);

