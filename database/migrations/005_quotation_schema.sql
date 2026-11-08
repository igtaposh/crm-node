DO $$
BEGIN
    CREATE TYPE quotation_status_type AS ENUM (
        'draft',
        'sent',
        'accepted',
        'rejected',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE service_type AS ENUM (
        'hotel',
        'cab',
        'package',
        'activity',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;




CREATE TABLE IF NOT EXISTS qoutations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    qoutaion_number VARCHAR(50) NOT NULL UNIQUE,
    enquiry_id UUID REFERENCES enquiries(id),
    customer_id UUID REFERENCES customers(id) NOT NULL,
    prepared_by UUID REFERENCES users(id),
    version INTEGER NOT NULL DEFAULT 1.0,
    valid_until DATE,
    subtotal DECIMAL(18,2) NOT NULL,
    discount DECIMAL(18,2) NOT NULL,
    taxable_amount DECIMAL(18,2) NOT NULL,
    tax_amount DECIMAL(18,2) NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'inr',
    status quotation_status_type NOT NULL DEFAULT 'sent',
    terms TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_quotation_number_per_organization_by_version
        UNIQUE (organization_id, version, qoutaion_number),
    CONSTRAINT valid_version CHECK (version >= 0),
    CONSTRAINT valid_subtotal CHECK (subtotal >= 0),
    CONSTRAINT valid_discount CHECK (discount >= 0),
    CONSTRAINT valid_taxable_amount CHECK (taxable_amount >= 0),
    CONSTRAINT valid_tax_amount CHECK (tax_amount >= 0),
    CONSTRAINT valid_total_amount CHECK (total_amount >= 0)
);

CREATE TABLE IF NOT EXISTS qoutation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    qoutation_id UUID NOT NULL REFERENCES qoutations(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    service_type service_type NOT NULL,
    quantity DECIMAL(18,2) NOT NULL,
    unit_price DECIMAL(18,2) NOT NULL,
    discount DECIMAL(18,2) NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL,

    CONSTRAINT valid_quantity CHECK (quantity >= 0),
    CONSTRAINT valid_unit_price CHECK (unit_price >= 0),
    CONSTRAINT valid_discount CHECK (discount >= 0),
    CONSTRAINT valid_tax_rate CHECK (tax_rate >= 0),
    CONSTRAINT valid_total_amount CHECK (total_amount >= 0)
);


