DO $$
BEGIN
    CREATE TYPE booking_status_type AS ENUM (
        'pending',
        'confirmed',
        'ongoing',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE payment_status_type AS ENUM (
        'unpaid',
        'partial',
        'paid',
        'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE gender_type AS ENUM (
        'male',
        'female',
        'other',
        'unspecified'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE guest_type AS ENUM (
        'adult',
        'child',
        'infant'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE canecellation_status_type AS ENUM (
        'requested',
        'approved',
        'rejected',
        'completed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    booking_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    qoutation_id UUID REFERENCES qoutations(id),
    package_id UUID REFERENCES tour_packages(id),
    assign_to UUID REFERENCES users(id),
    booking_date DATE NOT NULL,
    check_in DATE,
    check_out DATE,
    adults INTEGER NOT NULL,
    children INTEGER NOT NULL,
    infants INTEGER NOT NULL,
    pickup_location VARCHAR(200),
    drop_location VARCHAR(200),
    subtotal DECIMAL(18,2) NOT NULL,
    discount DECIMAL(18,2) NOT NULL,
    tax_amount DECIMAL(18,2) NOT NULL,
    final_amount DECIMAL(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'inr',
    booking_status booking_status_type NOT NULL DEFAULT 'pending',
    payment_status payment_status_type NOT NULL DEFAULT 'unpaid',
    internal_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_booking_number_per_organization
        UNIQUE (organization_id, booking_number),
    CONSTRAINT valid_adults CHECK (adults >= 0),
    CONSTRAINT valid_children CHECK (children >= 0),
    CONSTRAINT valid_infants CHECK (infants >= 0),
    CONSTRAINT valid_subtotal CHECK (subtotal >= 0),
    CONSTRAINT valid_discount CHECK (discount >= 0),
    CONSTRAINT valid_tax_amount CHECK (tax_amount >= 0),
    CONSTRAINT valid_final_amount CHECK (final_amount >= 0)
);

CREATE TABLE IF NOT EXISTS booking_guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    full_name VARCHAR(200) NOT NULL,
    age INTEGER,
    gender gender_type,
    guest_type guest_type NOT NULL DEFAULT 'adult',
    phone VARCHAR(20),
    document_type VARCHAR(50),
    document_number_encrypted TEXT,

    CONSTRAINT valid_age CHECK (age >= 0),
    CONSTRAINT booking_phone_format
        CHECK (phone IS NULL OR phone ~ '^[6-9]\d{9}$')
);



CREATE TABLE IF NOT EXISTS booking_cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    cancellation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    cancellation_charge DECIMAL(18,2) NOT NULL,
    refund_amount DECIMAL(18,2) NOT NULL,
    status canecellation_status_type NOT NULL DEFAULT 'requested',

    CONSTRAINT valid_cancellation_charge CHECK (cancellation_charge >= 0),
    CONSTRAINT valid_refund_amount CHECK (refund_amount >= 0)
    
);

