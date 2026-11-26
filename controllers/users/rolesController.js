import { pool, send_database_error } from "../../config/db.js";

export const create_roles = async (req, res) => {
  const { name, description } = req.body;
  const { organization_id } = req.user;
  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to manage roles.",
      });
    }
    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (typeof name !== "string" || !name.trim() || name.length > 100 || name.trim().toLowerCase() === "admin") {
      return res.status(400).json({
        success: false,
        message: "Invalid name.",
      });
    }
    const existing_role_name = await pool.query(
      `SELECT name FROM roles WHERE name = $1 AND organization_id = $2`,
      [name.trim(), organization_id],
    );
    if (existing_role_name.rowCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "A role already assigned with this name please try something else.",
      });
    }
    const result = await pool.query(
      `INSERT INTO roles (organization_id, name, description) VALUES ($1, $2, $3) RETURNING *`,
      [organization_id, name.trim(), description || null],
    );
    return res.status(201).json({
      success: true,
      message: "Role created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const delete_roles = async (req, res) => {
  const { role_id } = req.params;
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ success: false, message: "You are not authorized to manage roles." });
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        role_id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID.",
      });
    }
    const deleted_roles = await pool.query(
      `DELETE FROM roles WHERE id = $1 AND organization_id = $2 AND name <> 'admin' RETURNING id`,
      [role_id, req.user.organization_id],
    );
    if (deleted_roles.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Deletable role not found.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Role deleted successfully.",
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message: "Role is still assigned to users or permissions.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const list_roles = async (req, res) => {
  if (req.role !== "admin") {
    return res.status(403).json({ success: false, message: "Permission denied." });
  }
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description FROM roles WHERE organization_id = $1 ORDER BY name`,
      [req.user.organization_id],
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const get_role_permissions = async (req, res) => {
  if (req.role !== "admin") {
    return res.status(403).json({ success: false, message: "Permission denied." });
  }
  try {
    const role = await pool.query(
      "SELECT id FROM roles WHERE id = $1 AND organization_id = $2",
      [req.params.role_id, req.user.organization_id],
    );
    if (!role.rowCount) {
      return res.status(404).json({ success: false, message: "Role not found." });
    }
    const { rows } = await pool.query(
      `SELECT p.id, p.module, p.action, p.description,
              EXISTS (SELECT 1 FROM role_permissions rp
                      WHERE rp.role_id = $1 AND rp.permission_id = p.id) AS enabled
       FROM permissions p ORDER BY p.module, p.action, p.id`,
      [req.params.role_id],
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const set_role_permission = async (req, res) => {
  if (req.role !== "admin") {
    return res.status(403).json({ success: false, message: "Permission denied." });
  }
  const { role_id, permission_id } = req.params;
  const { enabled } = req.body || {};
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ success: false, message: "Enabled must be true or false." });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const role = await client.query(
      `SELECT id FROM roles WHERE id = $1 AND organization_id = $2 AND name <> 'admin' FOR UPDATE`,
      [role_id, req.user.organization_id],
    );
    if (!role.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Editable role not found." });
    }
    if (enabled) {
      const permission = await client.query("SELECT id FROM permissions WHERE id = $1", [permission_id]);
      if (!permission.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Permission not found." });
      }
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, $2 WHERE NOT EXISTS (
           SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2
         )`,
        [role_id, permission_id],
      );
    } else {
      await client.query(
        "DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2",
        [role_id, permission_id],
      );
    }
    await client.query("COMMIT");
    return res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    return send_database_error(res, error);
  } finally {
    client.release();
  }
};
