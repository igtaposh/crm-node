import { pool } from "../../config/db.js";

export const create_premissions = async (req, res) => {
  const { module, action, description } = req.body;
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
      `INSERT INTO permissions (module, action, description) VALUES ($1, $2, $3) RETURNING *`,
      [module, action, description || null],
    );
    return res.status(201).json({
      success: true,
      message: "Permission created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
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
      `SELECT * FROM permissions WHERE id = $1`,
      [id],
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
      `DELETE FROM permissions WHERE id = $1 RETURNING id`,
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
    "SELECT id, module, action, description FROM permissions ORDER BY module, action, id",
  );
  return res.json({ success: true, data: rows });
};
