import { pool } from "../../config/db.js";

export const create_premissions = async (req, res) => {
  const { module, action, description } = req.body;
  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update branch status.",
      });
    }
    if (!module) {
      return res.status(400).json({
        success: false,
        message: "Module is required.",
      });
    }
    if (!["crm", "finance", "bookings", "etc"].includes(module)) {
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
      !["create", "read", "update", "delete", "approved", "post"].includes(
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
  const { id } = req.params.permission_id;
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
      `SELECT * FROM permissions WHERE id = $1 RETURING id`,
      [id],
    );
    if (permission.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "No records found.",
      });
    }
    return res.status(200).json({
      success: false,
      message: "Permission fetched successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const delete_permission = async (req, res) => {
  const { id } = req.params.permission_id;
  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update branch status.",
      });
    }
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
      `DELETE FROM permissions WHERE id = $1 RETURING id`,
      [id],
    );
    if (deleted_permission.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "There is a error while deleting permossions.",
      });
    }
    return res.status(200).json({
      success: false,
      message: "Permission deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
