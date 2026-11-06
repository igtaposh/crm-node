
DO $$
BEGIN
    CREATE TYPE customer_type AS ENUM (
        'individual',
        'corporate',
        'agent'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;



CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_code VARCHAR(50),
    customer_type customer_type NOT NULL DEFAULT 'individual',
    name VARCHAR(200) NOT NULL,
    company_name VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    gstin VARCHAR(15),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'INDIA',
    source VARCHAR(100),
    notes TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    CONSTRAINT unique_customer_code_per_organization
        UNIQUE (organization_id, customer_code),
    CONSTRAINT customer_email_format
        CHECK (email IS NULL OR email ~ '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/'),
    CONSTRAINT customer_phone_format
        CHECK (phone IS NULL OR phone ~ '/^[6-9]\d{9}$/'),
    CONSTRAINT customer_alternate_phone_format
        CHECK (alternate_phone IS NULL OR alternate_phone ~ '/^[6-9]\d{9}$/'),
    CONSTRAINT customer_gstin_format
        CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$')
);





