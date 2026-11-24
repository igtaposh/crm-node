import { pool } from "../../config/db.js";

export const create_branch = async (req, res) => {
  const {
    branch_name,
    branch_code,
    email,
    phone,
    address,
    city,
    state,
    gstin,
    is_head_office,
  } = req.body;
  const { organization_id } = req.user;

  const isHeadOffice = is_head_office ?? true;

  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update branch status.",
      });
    }
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

    const existing_branch_code = await pool.query(
      `SELECT id FROM branches WHERE organization_id = $1 AND branch_code = $2`,
      [organization_id, branch_code],
    );

    if (existing_branch_code.rowCount !== 0) {
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

    const existingHeadOffice = await pool.query(
      `SELECT id FROM branches WHERE organization_id = $1 AND is_head_office = TRUE`,
      [organization_id],
    );

    if (is_head_office && existingHeadOffice.rowCount !== 0) {
      return res.status(403).json({
        success: false,
        message: "This organization already has a head office.",
      });
      z;
    }

    const result = await pool.query(
      `INSERT INTO branches
        (organization_id, branch_name, branch_code, email, phone, address, city, state, gstin, is_head_office)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Branch created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const get_all_branches = async (req, res) => {
  const { organization_id } = req.user;
  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update branch status.",
      });
    }
    const result = await pool.query(
      `
      SELECT * FROM branches WHERE organization_id = $1
      `,
      [organization_id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No branch found.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "ALL branches fethed successfully.",
      data: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const get_branch_by_id = async (req, res) => {
  const id = req.params?.id;
  const { organization_id } = req.user;
  try {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }
    const result = await pool.query(
      `SELECT * FROM branches WHERE id = $1 AND organization_id = $2`,
      [id, organization_id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No branch found with this ID.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "branch data fethed successfully.",
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

export const update_branch = async (req, res) => {
  const branch_id = req.params?.id;
  const { organization_id } = req.user;
  const { branch_name, branch_code, email, phone, gstin, pan, is_head_office } =
    req.body || {};

  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update branch status.",
      });
    }
    const fields = [
      { column: "branch_name", value: branch_name, pattern: /^.{1,150}$/u },
      { column: "branch_code", value: branch_code, pattern: /^.{1,30}$/u },
      {
        column: "email",
        value: email,
        pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        max_length: 255,
      },
      { column: "phone", value: phone, pattern: /^[6-9]\d{9}$/ },
      {
        column: "gstin",
        value: gstin,
        pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
      },
      { column: "pan", value: pan, pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/ },
    ];

    const updates = [];
    const values = [];

    for (const { column, value, pattern, max_length } of fields) {
      const field_value = typeof value === "string" ? value.trim() : value;

      if (field_value == null || field_value === "") {
        continue;
      }

      if (
        typeof field_value !== "string" ||
        !pattern.test(field_value) ||
        field_value.includes("\u0000") ||
        (max_length && field_value.length > max_length)
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${column}.`,
        });
      }

      values.push(field_value);
      updates.push(`${column} = $${values.length}`);
    }

    const head_office =
      typeof is_head_office === "string"
        ? is_head_office.trim()
        : is_head_office;

    if (head_office != null && head_office !== "") {
      if (typeof head_office !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "is_head_office must be true or false.",
        });
      }

      values.push(head_office);
      updates.push(`is_head_office = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update.",
      });
    }

    values.push(branch_id, organization_id);

    const result = await pool.query(
      `UPDATE branches
       SET ${updates.join(", ")}
       WHERE id = $${values.length - 1}
         AND organization_id = $${values.length}
       RETURNING *`,
      values,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No branch found with this ID.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Branch updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    if (
      error.code === "23505" &&
      error.constraint === "unique_head_office_per_organization"
    ) {
      return res.status(409).json({
        success: false,
        message: "This organization already has a head office.",
      });
    }

    if (
      error.code === "23505" &&
      error.constraint === "unique_branch_code_per_organization"
    ) {
      return res.status(409).json({
        success: false,
        message: "This branch code is already in use.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const update_branch_status = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const { organization_id } = req.user;

  const uuid_regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update branch status.",
      });
    }

    if (typeof id !== "string" || !uuid_regex.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    if (status !== "active" && status !== "inactive") {
      return res.status(400).json({
        success: false,
        message: "Branch status must be active or inactive.",
      });
    }

    const result = await pool.query(
      `WITH updated_branch AS (
         UPDATE branches
         SET status = $1
         WHERE id = $2 AND organization_id = $3
         RETURNING id, organization_id, status
       ),
       updated_users AS (
         UPDATE users AS u
         SET status = b.status::text::user_status,
             updated_at = NOW()
         FROM updated_branch AS b
         WHERE u.branch_id = b.id
           AND u.organization_id = b.organization_id
           AND u.status <> b.status::text::user_status
         RETURNING u.id
       )
       SELECT id, status,
              (SELECT COUNT(*)::integer FROM updated_users) AS updated_users
       FROM updated_branch`,
      [status, id, organization_id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No branch found with this ID.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Branch and user statuses updated successfully.",
      data: result.rows[0],
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
