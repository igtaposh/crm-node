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
      error,
    });
  }
};
