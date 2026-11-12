
DO $$
BEGIN
    CREATE TYPE user_status AS ENUM (
        'active',
        'suspended',
        'inactive'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;



CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30),
    password_hash TEXT NOT NULL,
    employee_code VARCHAR(50),
    designation VARCHAR(100),
    status user_status NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_email_format
        CHECK (email IS NULL OR email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
    CONSTRAINT user_phone_format
        CHECK (phone IS NULL OR phone ~ '^[6-9]\d{9}$')
);

CREATE TABLE IF NOT EXISTS check_user_email (
    user_id UUID REFERENCES users(id) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS user_otp (
    user_id UUID REFERENCES users(id) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(100) NOT NULL
        CHECK (module IN('crm','finance','booking','etc')),
    action VARCHAR(50) NOT NULL
        CHECK (action IN('create','read','update','delete','approve','post')),
    description TEXT
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(id) NOT NULL,
    role_id UUID REFERENCES roles(id) NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) NOT NULL,
    permission_id UUID REFERENCES permissions(id) NOT NULL
);




