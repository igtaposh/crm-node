DO $$
BEGIN
    CREATE TYPE destination_status_type AS ENUM (
        'active',
        'inactive'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE tour_pkgs_status_type AS ENUM (
        'active',
        'inactive',
        'draft',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE charge_type AS ENUM (
        'fixed-amount',
        'percentage'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;


CREATE TABLE IF NOT EXISTS cancellation_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 'true'
);


CREATE TABLE IF NOT EXISTS destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180),
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL DEFAULT 'india',
    description TEXT,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    status destination_status_type  NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS tour_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    package_code VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220),
    duration_days INTEGER NOT NULL,
    duration_nights INTEGER NOT NULL,
    base_price DECIMAL(18,2),
    currency CHAR(3) NOT NULL DEFAULT 'inr',
    description TEXT,
    inclusions JSONB NOT NULL,
    exclusions JSONB NOT NULL,
    cancellation_policy_id UUID REFERENCES cancellation_policies(id),
    status tour_pkgs_status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_duration_day CHECK (duration_days >= 0),
    CONSTRAINT valid_duration_night CHECK (duration_nights >= 0),
    CONSTRAINT valid_base_price CHECK (base_price >= 0)
);

CREATE TABLE IF NOT EXISTS package_destinatons (
    package_id UUID REFERENCES tour_packages(id) NOT NULL,
    destination_id UUID REFERENCES destinations(id) NOT NULL,
    sequence INTEGER NOT NULL,
 
    CONSTRAINT valid_sequence CHECK (sequence >= 0)
);

CREATE TABLE IF NOT EXISTS package_itinerary_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    package_id UUID REFERENCES tour_packages(id) NOT NULL,
    day_number INTEGER NOT NULL,
    title VARCHAR(200),
    description TEXT,
    starting_point VARCHAR(150),
    ending_point VARCHAR(150),
    distance_km DECIMAL(8,2),
    travel_duration VARCHAR(50),
    accommodation_notes TEXT,

    CONSTRAINT valid_day_number CHECK (day_number >= 0),
    CONSTRAINT valid_distance_km CHECK (distance_km >= 0)
);



CREATE TABLE IF NOT EXISTS cancellation_policy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES cancellation_policies(id) ON DELETE CASCADE,
    days_before_depurture INTEGER NOT NULL,
    charge_type charge_type NOT NULL,
    charge_value DECIMAL(18,2) NOT NULL,

    CONSTRAINT valid_day_number CHECK (days_before_depurture >= 0),
    CONSTRAINT valid_charge_value CHECK (charge_value >= 0)
);
