DO $$
BEGIN
    CREATE TYPE payment_method AS ENUM (
        'cash',
        'upi',
        'bank',
        'card',
        'cheque',
        'gateway'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE payment_type AS ENUM (
        'advance',
        'partial',
        'final',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE transaction_status_type AS ENUM (
        'pending',
        'completed',
        'failed',
        'reversed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE expense_category_type AS ENUM (
        'hotel',
        'cab',
        'food',
        'office',
        'marketing',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE expense_payment_status AS ENUM (
        'unpaid',
        'partial',
        'paid'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE supplier_payment_method AS ENUM (
        'cash',
        'upi',
        'bank',
        'cheque'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE supplier_payments_status_type AS ENUM (
        'pending',
        'completed',
        'reversed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
    CREATE TYPE refund_method_type AS ENUM (
        'original-method',
        'cash',
        'bank',
        'upi'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
    CREATE TYPE refund_status_type AS ENUM (
        'pending',
        'approved',
        'processed',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;


CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'inr',
    payment_method payment_method NOT NULL,
    transaction_reference VARCHAR(150),
    payment_type payment_type NOT NULL,
    status transaction_status_type NOT NULL DEFAULT 'pending',
    received_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_amount CHECK (amount >= 0)
);

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoive_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    allocation_amount DECIMAL(18,2) NOT NULL,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_allocation_amount CHECK (allocation_amount >= 0)
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    expense_number VARCHAR(50),
    expense_date DATE NOT NULL,
    category expense_category_type NOT NULL,
    description TEXT,
    amount DECIMAL(18,2) NOT NULL,
    tax_amount DECIMAL(18,2) NOT NULL,
    payment_status expense_payment_status NOT NULL,
    approoved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_amount CHECK (amount >= 0),
    CONSTRAINT valid_tax_amount CHECK (tax_amount >= 0)
);

CREATE TABLE IF NOT EXISTS supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    payment_number VARCHAR(50) NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'inr',
    payment_method supplier_payment_method NOT NULL,
    transaction_reference VARCHAR(150),
    status supplier_payments_status_type NOT NULL DEFAULT 'pending',

    CONSTRAINT valid_amount CHECK (amount >= 0)
);

CREATE TABLE IF NOT EXISTS supplier_payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_payment_id UUID NOT NULL REFERENCES supplier_payments(id) ON DELETE CASCADE,
    vendor_bill_id UUID NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
    allocated_amount DECIMAL(18,2) NOT NULL,

    CONSTRAINT valid_allocated_amount CHECK (allocated_amount >= 0)
);

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    refund_number VARCHAR(50) NOT NULL,
    payment_date DATE,
    amount DECIMAL(18,2) NOT NULL,
    reason TEXT,
    refund_method refund_method_type NOT NULL DEFAULT 'original-method',
    status refund_status_type NOT NULL DEFAULT 'pending',

    CONSTRAINT valid_amount CHECK (amount >= 0)
);
