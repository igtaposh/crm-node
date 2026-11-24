import { pool } from "../../config/db.js";

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
