import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCOUNT_TYPES = ["asset", "liability", "equity", "income", "expense"];
const ACCOUNT_STATUSES = ["active", "inactive"];

export const createAccount = async (req, res) => {
  const {
    organization_id,
    account_code,
    account_name,
    account_type,
    is_control_account,
    is_system_account,
    status,
  } = req.body;

  try {
    if (
      !organization_id ||
      !account_code ||
      !account_name ||
      !account_type ||
      is_control_account === undefined ||
      is_system_account === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organization_id, account_code, account_name, account_type, is_control_account, and is_system_account are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (!ACCOUNT_TYPES.includes(account_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid account_type. Allowed: ${ACCOUNT_TYPES.join(", ")}`,
      });
    }

    const statusValue = status ?? "active";
    if (!ACCOUNT_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${ACCOUNT_STATUSES.join(", ")}`,
      });
    }

    const existing = await pool.query(
      `SELECT id FROM charts_of_accounts WHERE organization_id = $1 AND account_code = $2`,
      [organization_id, account_code],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Account code already exists for this organization.",
      });
    }

    const result = await pool.query(
      `INSERT INTO charts_of_accounts
       (organization_id, account_code, account_name, account_type, is_control_account, is_system_account, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        organization_id,
        account_code,
        account_name,
        account_type,
        Boolean(is_control_account),
        Boolean(is_system_account),
        statusValue,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const getAllAccounts = async (req, res) => {
  const { organization_id, account_type, status } = req.query;
  try {
    let query = `SELECT * FROM charts_of_accounts WHERE 1=1`;
    const params = [];

    if (organization_id) {
      if (!UUID_REGEX.test(organization_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid organization ID.",
        });
      }
      params.push(organization_id);
      query += ` AND organization_id = $${params.length}`;
    }

    if (account_type) {
      params.push(account_type);
      query += ` AND account_type = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY account_code ASC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Accounts fetched successfully.",
      data: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const getAccountById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID.",
      });
    }

    const result = await pool.query(
      `SELECT * FROM charts_of_accounts WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account fetched successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const updateAccount = async (req, res) => {
  const { id } = req.params;
  const {
    account_code,
    account_name,
    account_type,
    is_control_account,
    is_system_account,
    status,
  } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID.",
      });
    }

    if (account_type && !ACCOUNT_TYPES.includes(account_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid account_type. Allowed: ${ACCOUNT_TYPES.join(", ")}`,
      });
    }

    if (status && !ACCOUNT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${ACCOUNT_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `UPDATE charts_of_accounts
       SET account_code = COALESCE($1, account_code),
           account_name = COALESCE($2, account_name),
           account_type = COALESCE($3, account_type),
           is_control_account = COALESCE($4, is_control_account),
           is_system_account = COALESCE($5, is_system_account),
           status = COALESCE($6, status)
       WHERE id = $7
       RETURNING *`,
      [
        account_code ?? null,
        account_name ?? null,
        account_type ?? null,
        is_control_account !== undefined ? Boolean(is_control_account) : null,
        is_system_account !== undefined ? Boolean(is_system_account) : null,
        status ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};
