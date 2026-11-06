import { pool } from "../../config/db.js";

export const createBranch = async (req, res) => {
  const {
    organization_id,
    branch_name,
    branch_code,
    email,
    phone,
    address,
    city,
    state,
    gstin,
    is_head_office,
    status,
  } = req.body;

  const statusValue = status ?? "active";
  const isHeadOffice = is_head_office ?? true;

  try {
    if (!organization_id || !branch_name || !branch_code) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
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

    const existing = await pool.query(
      `SELECT id FROM branches WHERE organization_id = $1 AND branch_code = $2`,
      [organization_id, branch_code],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Branch code is already exist.",
      });
    }
    if (email) {
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please enter valid email.",
        });
      }
    }
    if (phone) {
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Please enter valid phone.",
        });
      }
    }

    if (gstin) {
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) {
        return res.status(400).json({
          success: false,
          message: "Please enter valid GST number.",
        });
      }
    }

    if (status) {
      if (
        status !== "active" &&
        status !== "suspended" &&
        status !== "inactive"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Status value can not be different than 'active', 'suspended', 'inactive'.",
        });
      }
    }

    if (is_head_office !== undefined && typeof is_head_office !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_head_office must be a boolean.",
      });
    }

    const existingHeadOffice = await pool.query(
      `SELECT id FROM branches
   WHERE organization_id = $1
   AND is_head_office = TRUE`,
      [organization_id],
    );

    if (is_head_office && existingHeadOffice.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This organization already has a head office.",
      });
    }

    const result = await pool.query(
      `INSERT INTO branches
        (organization_id, branch_name, branch_code, email, phone, address, city, state, gstin, is_head_office, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
      [
        organization_id,
        branch_name,
        branch_code,
        email,
        phone,
        address,
        city,
        state,
        gstin,
        isHeadOffice,
        statusValue,
      ],
    );
    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Unble to create any branches.",
      });
    }
    return res.status(201).json({
      success: true,
      message: "Branch created successfully.",
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
