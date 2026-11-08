DO $$
BEGIN
    CREATE TYPE invoice_status_type AS ENUM (
        'draft',
        'issued',
        'partial',
        'paid',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE vendor_bills_status_type AS ENUM (
        'draft',
        'received',
        'approved',
        'paid',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE credit_note_status_type AS ENUM (
        'draft',
        'issued',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE vendor_credit_status_type AS ENUM (
        'draft',
        'approved',
        'applied',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;


CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    place_of_supply VARCHAR(100),
    taxable_amount DECIMAL(18,2) NOT NULL,
    cgst DECIMAL(18,2) NOT NULL,
    sgst DECIMAL(18,2) NOT NULL,
    igst DECIMAL(18,2) NOT NULL,
    cess DECIMAL(18,2) NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL,
    status invoice_status_type NOT NULL DEFAULT 'issued',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_taxable_amount CHECK (taxable_amount >= 0),
    CONSTRAINT valid_cgst CHECK (cgst >= 0),
    CONSTRAINT valid_sgst CHECK (sgst >= 0),
    CONSTRAINT valid_igst CHECK (igst >= 0),
    CONSTRAINT valid_cess CHECK (cess >= 0),
    CONSTRAINT valid_total_amount CHECK (total_amount >= 0)
);


CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    hsn_sac_code VARCHAR(20),
    quantity DECIMAL(10,2) NOT NULL,
    rate DECIMAL(18,2) NOT NULL,
    taxable_amount DECIMAL(18,2) NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL,
    tax_amount DECIMAL(18,2) NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL,

    CONSTRAINT valid_quantity CHECK (quantity >= 0),
    CONSTRAINT valid_rate CHECK (rate >= 0),
    CONSTRAINT valid_taxable_amount CHECK (taxable_amount >= 0),
    CONSTRAINT valid_tax_rate CHECK (tax_rate >= 0),
    CONSTRAINT valid_tax_amount CHECK (tax_amount >= 0),
    CONSTRAINT valid_total_amount CHECK (total_amount >= 0)
);

CREATE TABLE IF NOT EXISTS vendor_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    bill_number VARCHAR(100) NOT NULL,
    bill_date DATE NOT NULL,
    bill_due DATE,
    taxable_amount DECIMAL(18,2) NOT NULL,
    tax_amount DECIMAL(18,2) NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL,
    status vendor_bills_status_type NOT NULL DEFAULT 'received',

    
    CONSTRAINT valid_taxable_amount CHECK (taxable_amount >= 0),
    CONSTRAINT valid_tax_amount CHECK (tax_amount >= 0),
    CONSTRAINT valid_total_amount CHECK (total_amount >= 0)
);

CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    credit_note_number VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL,
    reason TEXT,
    taxable_amount DECIMAL(18,2) NOT NULL,
    tax_amount DECIMAL(18,2) NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL,
    status credit_note_status_type NOT NULL DEFAULT 'issued',

    
    CONSTRAINT valid_taxable_amount CHECK (taxable_amount >= 0),
    CONSTRAINT valid_tax_amount CHECK (tax_amount >= 0),
    CONSTRAINT valid_total_amount CHECK (total_amount >= 0)
);

CREATE TABLE IF NOT EXISTS vendor_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    vendor_bill_id UUID REFERENCES vendor_bills(id) ON DELETE CASCADE,
    credit_note_number VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL,
    reason TEXT,
    taxable_amount DECIMAL(18,2) NOT NULL,
    tax_amount DECIMAL(18,2) NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL,
    status vendor_credit_status_type NOT NULL DEFAULT 'approved',

    
    CONSTRAINT valid_taxable_amount CHECK (taxable_amount >= 0),
    CONSTRAINT valid_tax_amount CHECK (tax_amount >= 0),
    CONSTRAINT valid_total_amount CHECK (total_amount >= 0)
);