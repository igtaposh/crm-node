DO $$
BEGIN
    CREATE TYPE organization_status AS ENUM (
        'active',
        'suspended',
        'inactive'
    );
   
    
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;


DO $$
BEGIN
    CREATE TYPE branch_status AS ENUM (
        'active',
        'inactive'
    );
    
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;



CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(250),
    slug VARCHAR(150) NOT NULL UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(30),
    website VARCHAR(255),
    gstin VARCHAR(15),
    pan VARCHAR(10),
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Kolkata',
    status  organization_status NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT organizations_currency_format
        CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
    CONSTRAINT organizations_gstin_format
        CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
    CONSTRAINT organizations_pan_format
        CHECK (pan IS NULL OR pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$')
);

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID  NOT NULL  REFERENCES organizations(id) ON DELETE CASCADE,
    branch_name VARCHAR(150) NOT NULL,
    branch_code VARCHAR(30) NOT NULL ,
    email VARCHAR(255),
    phone VARCHAR(30),
    address TEXT,
    city VARCHAR(150),
    state VARCHAR(100),
    gstin VARCHAR(15),
    is_head_office BOOLEAN NOT NULL DEFAULT false,
    status branch_status NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_branch_code_per_organization
        UNIQUE (organization_id, branch_code),
    CONSTRAINT branch_gstin_format
        CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
    CONSTRAINT branch_email_format
        CHECK (email IS NULL OR email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
    CONSTRAINT branch_phone_format
        CHECK (phone IS NULL OR phone ~ '^[6-9]\d{9}$')
);
