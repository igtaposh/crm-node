ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS permissions_organization_module_action_idx
    ON permissions (organization_id, module, action)
    WHERE organization_id IS NOT NULL;
