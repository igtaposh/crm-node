import { pool } from "../../config/db.js";

export const create_roles = async (req, res) => {
  const { organization_id, name, description } = req.body;
  try {
    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        organization_id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
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
      error,
    });
  }
};
