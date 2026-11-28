import { pool, send_database_error } from "../../config/db.js";

const create_permission = async (req, res, organization_id) => {
  const { module, action, description } = req.body || {};
  try {
    if (!module) {
      return res.status(400).json({
        success: false,
        message: "Module is required.",
      });
    }
    if (!["crm", "finance", "booking", "etc"].includes(module)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid module.",
      });
    }
    if (!action) {
      return res.status(400).json({
        success: false,
        message: "Invalid action.",
      });
    }
    if (
      !["create", "read", "update", "delete", "approve", "post"].includes(
        action,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid action.",
      });
    }

    const result = await pool.query(
      `INSERT INTO permissions (module, action, description, organization_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [module, action, description || null, organization_id],
    );
    return res.status(201).json({
      success: true,
      message: "Permission created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const create_premissions = (req, res) => create_permission(req, res, null);

export const create_organization_permission = (req, res) => {
  if (req.role !== "admin") {
    return res.status(403).json({ success: false, message: "Permission denied." });
  }
  return create_permission(req, res, req.user.organization_id);
};

export const list_organization_permissions = async (req, res) => {
  if (req.role !== "admin") {
    return res.status(403).json({ success: false, message: "Permission denied." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, module, action, description,
              CASE WHEN organization_id IS NULL THEN 'Shared' ELSE 'Organization' END AS scope
       FROM permissions
       WHERE organization_id IS NULL OR organization_id = $1
       ORDER BY module, action, id`,
      [req.user.organization_id],
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const get_permission_by_id = async (req, res) => {
  const { id } = req.params;
  try {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid permission ID.",
      });
    }

    const permission = await pool.query(
      `SELECT * FROM permissions WHERE id = $1 AND (organization_id IS NULL OR organization_id = $2)`,
      [id, req.user.organization_id],
    );
    if (permission.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "No records found.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Permission fetched successfully.",
      data: permission.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const delete_permission = async (req, res) => {
  const { id } = req.params;
  try {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid permission ID.",
      });
    }

    const deleted_permission = await pool.query(
      `DELETE FROM permissions WHERE id = $1 AND organization_id IS NULL RETURNING id`,
      [id],
    );
    if (deleted_permission.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Permission not found.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Permission deleted successfully.",
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message: "Permission is still assigned to a role.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const list_permissions = async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT id, module, action, description FROM permissions WHERE organization_id IS NULL ORDER BY module, action, id",
  );
  return res.json({ success: true, data: rows });
};
