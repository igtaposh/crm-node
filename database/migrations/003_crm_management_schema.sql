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

DO $$
BEGIN
    CREATE TYPE source_type AS ENUM (
        'website',
        'whatsapp',
        'refferal',
        'social',
        'walk-in',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE status_type AS ENUM (
        'new',
        'contacted',
        'qualified',
        'proposal',
        'converted',
        'lost'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;


DO $$
BEGIN
    CREATE TYPE priority_type AS ENUM (
        'low',
        'medium',
        'high',
        'urgent'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE enquiry_status_type AS ENUM (
        'open',
        'qouted',
        'converted',
        'closed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE activity_type AS ENUM (
        'call',
        'email',
        'whatsapp',
        'meeting',
        'note'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE task_status_type AS ENUM (
        'pending',
        'in-progress'

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
        CHECK (email IS NULL OR email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
    CONSTRAINT customer_phone_format
        CHECK (phone IS NULL OR phone ~ '^[6-9]\d{9}$'),
    CONSTRAINT customer_alternate_phone_format
        CHECK (alternate_phone IS NULL OR alternate_phone ~ '^[6-9]\d{9}$'),
    CONSTRAINT customer_gstin_format
        CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$')
);

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE CASCADE,
    lead_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    source source_type,
    destination VARCHAR(150),
    expected_budget DECIMAL(18,2),
    travel_date DATE,
    status status_type NOT NULL DEFAULT 'new',
    priority priority_type NOT NULL DEFAULT 'medium',
    next_follow_up TIMESTAMPTZ,
    lost_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    
    CONSTRAINT leads_email_format
        CHECK (email IS NULL OR email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
    CONSTRAINT leads_phone_format
        CHECK (phone IS NULL OR phone ~ '^[6-9]\d{9}$')
);

CREATE TABLE IF NOT EXISTS enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE CASCADE,
    enquiry_number VARCHAR(50) NOT NULL UNIQUE,
    destination VARCHAR(200),
    travel_start_date DATE,
    travel_end_date DATE,
    adults INTEGER NOT NULL,
    children INTEGER NOT NULL,
    infants INTEGER NOT NULL,
    budget DECIMAL(18,2),
    transport_required BOOLEAN NOT NULL,
    hotel_required BOOLEAN NOT NULL,
    special_requirements TEXT,
    status enquiry_status_type NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_enquiry_number_per_organization
        UNIQUE (organization_id, enquiry_number),
    CONSTRAINT check_end_date CHECK (travel_end_date >= travel_start_date),
    CONSTRAINT valid_adults_number CHECK (adults >= 0),
    CONSTRAINT valid_children_number CHECK (children >= 0),
    CONSTRAINT valid_infants_number CHECK (infants >= 0)
);

CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type activity_type NOT NULL,
    subject VARCHAR(200),
    description TEXT,
    activity_date TIMESTAMPTZ DEFAULT NOW(),
    next_follow_up TIMESTAMPTZ 
);
 
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- entity_type VARCHAR(50),
    -- entity_id UUID REFERENCES entities(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority priority_type NOT NULL DEFAULT 'medium',
    status task_status_type NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);








