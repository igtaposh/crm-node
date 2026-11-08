DO $$
BEGIN
    CREATE TYPE supplier_type AS ENUM (
        'hotel',
        'cab',
        'restaurant',
        'activity',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE supplier_status_type AS ENUM (
        'active',
        'inactive',
        'blocked'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE booking_service_type  AS ENUM (
        'hotel',
        'cab',
        'activity',
        'transfer',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE booking_service_status_type  AS ENUM (
        'pending',
        'confimed',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE meal_plan AS ENUM (
        'ep',
        'cp',
        'map',
        'ap'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE trip_type AS ENUM (
        'transfer',
        'loacal',
        'point-to-point',
        'multi-day'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE status_type AS ENUM (
        'draft',
        'issued',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_code VARCHAR(50),
    supplier_type supplier_type NOT NULL,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(20),
    gstin VARCHAR(15),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    bank_details_encrypted JSONB,
    status supplier_status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

     CONSTRAINT supplier_gstin_format
        CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
    CONSTRAINT supplier_email_format
        CHECK (email IS NULL OR email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
    CONSTRAINT supplier_phone_format
        CHECK (phone IS NULL OR phone ~ '^[6-9]\d{9}$')
);

CREATE TABLE IF NOT EXISTS supplier_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(150),
    designation VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),

    CONSTRAINT supplier_email_format
        CHECK (email IS NULL OR email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
    CONSTRAINT supplier_phone_format
        CHECK (phone IS NULL OR phone ~ '^[6-9]\d{9}$')
);


CREATE TABLE IF NOT EXISTS booking_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    service_type booking_service_type NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    service_date DATE,
    start_date DATE,
    end_date DATE,
    selling_price DECIMAL(18,2) NOT NULL,
    supplier_cost DECIMAL(18,2) NOT NULL,
    confirmation_number VARCHAR(100),
    supplier_reference VARCHAR(100),
    status booking_service_status_type NOT NULL DEFAULT 'pending',
    notes TEXT,

    CONSTRAINT check_end_date CHECK (end_date >= start_date),
    CONSTRAINT valid_selling_price CHECK (selling_price >= 0),
    CONSTRAINT valid_supplier_cost CHECK (supplier_cost >= 0)
    
);

CREATE TABLE IF NOT EXISTS hotel_service_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    booking_service_id UUID NOT NULL REFERENCES booking_services(id) ON DELETE CASCADE,
    hotel_name VARCHAR(200) NOT NULL,
    room_category VARCHAR(150),
    meal_plan meal_plan DEFAULT 'cp',
    rooms INTEGER NOT NULL DEFAULT 1,
    adults INTEGER NOT NULL DEFAULT 1,
    children INTEGER NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    extra_beds INTEGER NOT NULL DEFAULT 0,
    confirmation_number VARCHAR(100),

    CONSTRAINT valid_rooms CHECK (rooms >= 0),
    CONSTRAINT valid_adults CHECK (adults >= 0),
    CONSTRAINT valid_children CHECK (children >= 0),
    CONSTRAINT valid_extra_beds CHECK (extra_beds >= 0)
);


CREATE TABLE IF NOT EXISTS cab_service_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    booking_service_id UUID NOT NULL REFERENCES booking_services(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    voucher_number VARCHAR(50) NOT NULL,
    confirmation_number VARCHAR(100),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    document_id UUID REFERENCES documents(id),
    status status_type NOT NULL DEFAULT 'issued'
);


CREATE TABLE IF NOT EXISTS service_voucher (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    booking_service_id UUID NOT NULL REFERENCES booking_services(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(100),
    vehicle_number VARCHAR (30),
    driver_name VARCHAR(150),
    driver_phone VARCHAR(30),
    pickup_location TEXT,
    drop_location TEXT,
    pickup_time TIMESTAMPTZ,
    trip_type trip_type,
    distance_km DECIMAL(10,2),

    CONSTRAINT valid_vehicle_number
        CHECK ( vehicle_number IS NULL OR UPPER(vehicle_number) ~ '^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$'),
    CONSTRAINT cab_phone_format
        CHECK (driver_phone IS NULL OR driver_phone ~ '^[6-9]\d{9}$'),
    CONSTRAINT valid_distance_km CHECK (distance_km >= 0)
);
