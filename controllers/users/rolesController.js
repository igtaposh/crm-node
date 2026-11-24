import { pool } from "../../config/db.js";

export const create_roles = async (req, res) => {
  const { name, description } = req.body;
  const { organization_id } = req.user;
  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update branch status.",
      });
    }
    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Invalid name.",
      });
    }
    const existing_role_name = await pool.query(
      `SELECT name FROM roles WHERE name = $1 AND organization_id = $2`,
      [name, organization_id],
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
      [organization_id, name, description || null],
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
      `DELETE FROM roles WHERE id = $1 RETURING id`,
      [role_id],
    );
    if (deleted_roles.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "There is a error while deleting role.",
      });
    }
    return res.status(200).json({
      success: false,
      message: "Role deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
