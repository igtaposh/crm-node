-- Keep existing records while enforcing organization ownership on new links.

CREATE UNIQUE INDEX IF NOT EXISTS bank_accounts_organization_id_id_idx
    ON bank_accounts (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS booking_services_organization_id_id_idx
    ON booking_services (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_organization_id_id_idx
    ON bookings (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS branches_organization_id_id_idx
    ON branches (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS cancellation_policies_organization_id_id_idx
    ON cancellation_policies (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS charts_of_accounts_organization_id_id_idx
    ON charts_of_accounts (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS customers_organization_id_id_idx
    ON customers (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS documents_organization_id_id_idx
    ON documents (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS enquiries_organization_id_id_idx
    ON enquiries (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_organization_id_id_idx
    ON invoices (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS leads_organization_id_id_idx
    ON leads (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS payments_organization_id_id_idx
    ON payments (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS qoutations_organization_id_id_idx
    ON qoutations (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_payments_organization_id_id_idx
    ON supplier_payments (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_organization_id_id_idx
    ON suppliers (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS tour_packages_organization_id_id_idx
    ON tour_packages (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS users_organization_id_id_idx
    ON users (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS vendor_bills_organization_id_id_idx
    ON vendor_bills (organization_id, id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'audit_logs'::regclass AND conname = 'audit_logs_user_id_org_fk'
    ) THEN
        ALTER TABLE audit_logs
            ADD CONSTRAINT audit_logs_user_id_org_fk
        FOREIGN KEY (organization_id, user_id) REFERENCES users (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'bank_accounts'::regclass AND conname = 'bank_accounts_ledger_account_id_org_fk'
    ) THEN
        ALTER TABLE bank_accounts
            ADD CONSTRAINT bank_accounts_ledger_account_id_org_fk
        FOREIGN KEY (organization_id, ledger_account_id) REFERENCES charts_of_accounts (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'bank_transactions'::regclass AND conname = 'bank_transactions_bank_account_id_org_fk'
    ) THEN
        ALTER TABLE bank_transactions
            ADD CONSTRAINT bank_transactions_bank_account_id_org_fk
        FOREIGN KEY (organization_id, bank_account_id) REFERENCES bank_accounts (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'booking_cancellations'::regclass AND conname = 'booking_cancellations_booking_id_org_fk'
    ) THEN
        ALTER TABLE booking_cancellations
            ADD CONSTRAINT booking_cancellations_booking_id_org_fk
        FOREIGN KEY (organization_id, booking_id) REFERENCES bookings (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'booking_cancellations'::regclass AND conname = 'booking_cancellations_cancelled_by_org_fk'
    ) THEN
        ALTER TABLE booking_cancellations
            ADD CONSTRAINT booking_cancellations_cancelled_by_org_fk
        FOREIGN KEY (organization_id, cancelled_by) REFERENCES users (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'booking_guests'::regclass AND conname = 'booking_guests_booking_id_org_fk'
    ) THEN
        ALTER TABLE booking_guests
            ADD CONSTRAINT booking_guests_booking_id_org_fk
        FOREIGN KEY (organization_id, booking_id) REFERENCES bookings (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'booking_services'::regclass AND conname = 'booking_services_supplier_id_org_fk'
    ) THEN
        ALTER TABLE booking_services
            ADD CONSTRAINT booking_services_supplier_id_org_fk
        FOREIGN KEY (organization_id, supplier_id) REFERENCES suppliers (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'bookings'::regclass AND conname = 'bookings_branch_id_org_fk'
    ) THEN
        ALTER TABLE bookings
            ADD CONSTRAINT bookings_branch_id_org_fk
        FOREIGN KEY (organization_id, branch_id) REFERENCES branches (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'bookings'::regclass AND conname = 'bookings_customer_id_org_fk'
    ) THEN
        ALTER TABLE bookings
            ADD CONSTRAINT bookings_customer_id_org_fk
        FOREIGN KEY (organization_id, customer_id) REFERENCES customers (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'bookings'::regclass AND conname = 'bookings_qoutation_id_org_fk'
    ) THEN
        ALTER TABLE bookings
            ADD CONSTRAINT bookings_qoutation_id_org_fk
        FOREIGN KEY (organization_id, qoutation_id) REFERENCES qoutations (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'bookings'::regclass AND conname = 'bookings_package_id_org_fk'
    ) THEN
        ALTER TABLE bookings
            ADD CONSTRAINT bookings_package_id_org_fk
        FOREIGN KEY (organization_id, package_id) REFERENCES tour_packages (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'bookings'::regclass AND conname = 'bookings_assign_to_org_fk'
    ) THEN
        ALTER TABLE bookings
            ADD CONSTRAINT bookings_assign_to_org_fk
        FOREIGN KEY (organization_id, assign_to) REFERENCES users (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'cab_service_details'::regclass AND conname = 'cab_service_details_booking_service_id_org_fk'
    ) THEN
        ALTER TABLE cab_service_details
            ADD CONSTRAINT cab_service_details_booking_service_id_org_fk
        FOREIGN KEY (organization_id, booking_service_id) REFERENCES booking_services (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'cab_service_details'::regclass AND conname = 'cab_service_details_booking_id_org_fk'
    ) THEN
        ALTER TABLE cab_service_details
            ADD CONSTRAINT cab_service_details_booking_id_org_fk
        FOREIGN KEY (organization_id, booking_id) REFERENCES bookings (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'cab_service_details'::regclass AND conname = 'cab_service_details_document_id_org_fk'
    ) THEN
        ALTER TABLE cab_service_details
            ADD CONSTRAINT cab_service_details_document_id_org_fk
        FOREIGN KEY (organization_id, document_id) REFERENCES documents (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'credit_notes'::regclass AND conname = 'credit_notes_invoice_id_org_fk'
    ) THEN
        ALTER TABLE credit_notes
            ADD CONSTRAINT credit_notes_invoice_id_org_fk
        FOREIGN KEY (organization_id, invoice_id) REFERENCES invoices (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'documents'::regclass AND conname = 'documents_uploaded_by_org_fk'
    ) THEN
        ALTER TABLE documents
            ADD CONSTRAINT documents_uploaded_by_org_fk
        FOREIGN KEY (organization_id, uploaded_by) REFERENCES users (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'enquiries'::regclass AND conname = 'enquiries_lead_id_org_fk'
    ) THEN
        ALTER TABLE enquiries
            ADD CONSTRAINT enquiries_lead_id_org_fk
        FOREIGN KEY (organization_id, lead_id) REFERENCES leads (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'enquiries'::regclass AND conname = 'enquiries_customer_id_org_fk'
    ) THEN
        ALTER TABLE enquiries
            ADD CONSTRAINT enquiries_customer_id_org_fk
        FOREIGN KEY (organization_id, customer_id) REFERENCES customers (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'enquiries'::regclass AND conname = 'enquiries_assigned_to_org_fk'
    ) THEN
        ALTER TABLE enquiries
            ADD CONSTRAINT enquiries_assigned_to_org_fk
        FOREIGN KEY (organization_id, assigned_to) REFERENCES users (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'expenses'::regclass AND conname = 'expenses_branch_id_org_fk'
    ) THEN
        ALTER TABLE expenses
            ADD CONSTRAINT expenses_branch_id_org_fk
        FOREIGN KEY (organization_id, branch_id) REFERENCES branches (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'expenses'::regclass AND conname = 'expenses_booking_id_org_fk'
    ) THEN
        ALTER TABLE expenses
            ADD CONSTRAINT expenses_booking_id_org_fk
        FOREIGN KEY (organization_id, booking_id) REFERENCES bookings (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'expenses'::regclass AND conname = 'expenses_supplier_id_org_fk'
    ) THEN
        ALTER TABLE expenses
            ADD CONSTRAINT expenses_supplier_id_org_fk
        FOREIGN KEY (organization_id, supplier_id) REFERENCES suppliers (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'expenses'::regclass AND conname = 'expenses_approoved_by_org_fk'
    ) THEN
        ALTER TABLE expenses
            ADD CONSTRAINT expenses_approoved_by_org_fk
        FOREIGN KEY (organization_id, approoved_by) REFERENCES users (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'invoices'::regclass AND conname = 'invoices_branch_id_org_fk'
    ) THEN
        ALTER TABLE invoices
            ADD CONSTRAINT invoices_branch_id_org_fk
        FOREIGN KEY (organization_id, branch_id) REFERENCES branches (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'invoices'::regclass AND conname = 'invoices_booking_id_org_fk'
    ) THEN
        ALTER TABLE invoices
            ADD CONSTRAINT invoices_booking_id_org_fk
        FOREIGN KEY (organization_id, booking_id) REFERENCES bookings (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'invoices'::regclass AND conname = 'invoices_customer_id_org_fk'
    ) THEN
        ALTER TABLE invoices
            ADD CONSTRAINT invoices_customer_id_org_fk
        FOREIGN KEY (organization_id, customer_id) REFERENCES customers (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'journal_entries'::regclass AND conname = 'journal_entries_branch_id_org_fk'
    ) THEN
        ALTER TABLE journal_entries
            ADD CONSTRAINT journal_entries_branch_id_org_fk
        FOREIGN KEY (organization_id, branch_id) REFERENCES branches (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'journal_entries'::regclass AND conname = 'journal_entries_posted_by_org_fk'
    ) THEN
        ALTER TABLE journal_entries
            ADD CONSTRAINT journal_entries_posted_by_org_fk
        FOREIGN KEY (organization_id, posted_by) REFERENCES users (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'lead_activities'::regclass AND conname = 'lead_activities_lead_id_org_fk'
    ) THEN
        ALTER TABLE lead_activities
            ADD CONSTRAINT lead_activities_lead_id_org_fk
        FOREIGN KEY (organization_id, lead_id) REFERENCES leads (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'lead_activities'::regclass AND conname = 'lead_activities_user_id_org_fk'
    ) THEN
        ALTER TABLE lead_activities
            ADD CONSTRAINT lead_activities_user_id_org_fk
        FOREIGN KEY (organization_id, user_id) REFERENCES users (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'leads'::regclass AND conname = 'leads_customer_id_org_fk'
    ) THEN
        ALTER TABLE leads
            ADD CONSTRAINT leads_customer_id_org_fk
        FOREIGN KEY (organization_id, customer_id) REFERENCES customers (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'leads'::regclass AND conname = 'leads_assigned_to_org_fk'
    ) THEN
        ALTER TABLE leads
            ADD CONSTRAINT leads_assigned_to_org_fk
        FOREIGN KEY (organization_id, assigned_to) REFERENCES users (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'notifications'::regclass AND conname = 'notifications_user_id_org_fk'
    ) THEN
        ALTER TABLE notifications
            ADD CONSTRAINT notifications_user_id_org_fk
        FOREIGN KEY (organization_id, user_id) REFERENCES users (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'payment_allocations'::regclass AND conname = 'payment_allocations_payment_id_org_fk'
    ) THEN
        ALTER TABLE payment_allocations
            ADD CONSTRAINT payment_allocations_payment_id_org_fk
        FOREIGN KEY (organization_id, payment_id) REFERENCES payments (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'payments'::regclass AND conname = 'payments_customer_id_org_fk'
    ) THEN
        ALTER TABLE payments
            ADD CONSTRAINT payments_customer_id_org_fk
        FOREIGN KEY (organization_id, customer_id) REFERENCES customers (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'payments'::regclass AND conname = 'payments_booking_id_org_fk'
    ) THEN
        ALTER TABLE payments
            ADD CONSTRAINT payments_booking_id_org_fk
        FOREIGN KEY (organization_id, booking_id) REFERENCES bookings (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'payments'::regclass AND conname = 'payments_received_by_org_fk'
    ) THEN
        ALTER TABLE payments
            ADD CONSTRAINT payments_received_by_org_fk
        FOREIGN KEY (organization_id, received_by) REFERENCES users (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'qoutations'::regclass AND conname = 'qoutations_enquiry_id_org_fk'
    ) THEN
        ALTER TABLE qoutations
            ADD CONSTRAINT qoutations_enquiry_id_org_fk
        FOREIGN KEY (organization_id, enquiry_id) REFERENCES enquiries (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'qoutations'::regclass AND conname = 'qoutations_customer_id_org_fk'
    ) THEN
        ALTER TABLE qoutations
            ADD CONSTRAINT qoutations_customer_id_org_fk
        FOREIGN KEY (organization_id, customer_id) REFERENCES customers (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'qoutations'::regclass AND conname = 'qoutations_prepared_by_org_fk'
    ) THEN
        ALTER TABLE qoutations
            ADD CONSTRAINT qoutations_prepared_by_org_fk
        FOREIGN KEY (organization_id, prepared_by) REFERENCES users (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'refunds'::regclass AND conname = 'refunds_booking_id_org_fk'
    ) THEN
        ALTER TABLE refunds
            ADD CONSTRAINT refunds_booking_id_org_fk
        FOREIGN KEY (organization_id, booking_id) REFERENCES bookings (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'refunds'::regclass AND conname = 'refunds_payment_id_org_fk'
    ) THEN
        ALTER TABLE refunds
            ADD CONSTRAINT refunds_payment_id_org_fk
        FOREIGN KEY (organization_id, payment_id) REFERENCES payments (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'supplier_payment_allocations'::regclass AND conname = 'supplier_payment_allocations_supplier_payment_id_org_fk'
    ) THEN
        ALTER TABLE supplier_payment_allocations
            ADD CONSTRAINT supplier_payment_allocations_supplier_payment_id_org_fk
        FOREIGN KEY (organization_id, supplier_payment_id) REFERENCES supplier_payments (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'supplier_payment_allocations'::regclass AND conname = 'supplier_payment_allocations_vendor_bill_id_org_fk'
    ) THEN
        ALTER TABLE supplier_payment_allocations
            ADD CONSTRAINT supplier_payment_allocations_vendor_bill_id_org_fk
        FOREIGN KEY (organization_id, vendor_bill_id) REFERENCES vendor_bills (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'supplier_payments'::regclass AND conname = 'supplier_payments_supplier_id_org_fk'
    ) THEN
        ALTER TABLE supplier_payments
            ADD CONSTRAINT supplier_payments_supplier_id_org_fk
        FOREIGN KEY (organization_id, supplier_id) REFERENCES suppliers (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'tasks'::regclass AND conname = 'tasks_assigned_to_org_fk'
    ) THEN
        ALTER TABLE tasks
            ADD CONSTRAINT tasks_assigned_to_org_fk
        FOREIGN KEY (organization_id, assigned_to) REFERENCES users (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'tasks'::regclass AND conname = 'tasks_created_by_org_fk'
    ) THEN
        ALTER TABLE tasks
            ADD CONSTRAINT tasks_created_by_org_fk
        FOREIGN KEY (organization_id, created_by) REFERENCES users (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'tour_packages'::regclass AND conname = 'tour_packages_cancellation_policy_id_org_fk'
    ) THEN
        ALTER TABLE tour_packages
            ADD CONSTRAINT tour_packages_cancellation_policy_id_org_fk
        FOREIGN KEY (organization_id, cancellation_policy_id) REFERENCES cancellation_policies (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'users'::regclass AND conname = 'users_branch_id_org_fk'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_branch_id_org_fk
        FOREIGN KEY (organization_id, branch_id) REFERENCES branches (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'vendor_bills'::regclass AND conname = 'vendor_bills_supplier_id_org_fk'
    ) THEN
        ALTER TABLE vendor_bills
            ADD CONSTRAINT vendor_bills_supplier_id_org_fk
        FOREIGN KEY (organization_id, supplier_id) REFERENCES suppliers (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'vendor_bills'::regclass AND conname = 'vendor_bills_booking_id_org_fk'
    ) THEN
        ALTER TABLE vendor_bills
            ADD CONSTRAINT vendor_bills_booking_id_org_fk
        FOREIGN KEY (organization_id, booking_id) REFERENCES bookings (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'vendor_credits'::regclass AND conname = 'vendor_credits_supplier_id_org_fk'
    ) THEN
        ALTER TABLE vendor_credits
            ADD CONSTRAINT vendor_credits_supplier_id_org_fk
        FOREIGN KEY (organization_id, supplier_id) REFERENCES suppliers (organization_id, id)
        NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'vendor_credits'::regclass AND conname = 'vendor_credits_vendor_bill_id_org_fk'
    ) THEN
        ALTER TABLE vendor_credits
            ADD CONSTRAINT vendor_credits_vendor_bill_id_org_fk
        FOREIGN KEY (organization_id, vendor_bill_id) REFERENCES vendor_bills (organization_id, id)
        NOT VALID;
    END IF;
END
$$;

ALTER TABLE journal_lines DROP CONSTRAINT IF EXISTS journal_lines_account_id_fkey;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'journal_lines'::regclass AND conname = 'journal_lines_ledger_account_fk'
    ) THEN
        ALTER TABLE journal_lines
            ADD CONSTRAINT journal_lines_ledger_account_fk
    FOREIGN KEY (account_id) REFERENCES charts_of_accounts(id) NOT VALID;
    END IF;
END
$$;
