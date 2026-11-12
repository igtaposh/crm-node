import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PERIOD_STATUSES = ["open", "closed", "locked"];
const RECONCILIATION_STATUSES = ["unmatched", "matched", "reconciled"];

export const createAccountingPeriod = async (req, res) => {
  const { organization_id, period_name, start_date, end_date, status } =
    req.body;

  try {
    if (!organization_id || !period_name || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message:
          "organization_id, period_name, start_date, and end_date are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({
        success: false,
        message: "end_date must be on or after start_date.",
      });
    }

    const statusValue = status ?? "open";
    if (!PERIOD_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${PERIOD_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `INSERT INTO accounting_periods (organization_id, period_name, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [organization_id, period_name, start_date, end_date, statusValue],
    );

    return res.status(201).json({
      success: true,
      message: "Accounting period created successfully.",
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

export const getAllAccountingPeriods = async (req, res) => {
  const { organization_id, status } = req.query;
  try {
    let query = `SELECT * FROM accounting_periods WHERE 1=1`;
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

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY start_date DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Accounting periods fetched successfully.",
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

export const updateAccountingPeriodStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid period ID.",
      });
    }

    if (!status || !PERIOD_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${PERIOD_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `UPDATE accounting_periods SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Accounting period not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Accounting period status updated successfully.",
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

export const createBankTransaction = async (req, res) => {
  const {
    organization_id,
    bank_account_id,
    transaction_date,
    description,
    reference_number,
    debit,
    credit,
    balance,
    reconcilition_status,
  } = req.body;

  try {
    if (
      !organization_id ||
      !bank_account_id ||
      !transaction_date ||
      debit === undefined ||
      credit === undefined ||
      !reconcilition_status
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organization_id, bank_account_id, transaction_date, debit, credit, and reconcilition_status are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (!UUID_REGEX.test(bank_account_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bank_account_id.",
      });
    }

    if (!RECONCILIATION_STATUSES.includes(reconcilition_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reconcilition_status. Allowed: ${RECONCILIATION_STATUSES.join(", ")}`,
      });
    }

    if (debit < 0 || credit < 0 || (balance !== undefined && balance < 0)) {
      return res.status(400).json({
        success: false,
        message: "Amounts must be non-negative.",
      });
    }

    const result = await pool.query(
      `INSERT INTO bank_transactions
       (organization_id, bank_account_id, transaction_date, description, reference_number, debit, credit, balance, reconcilition_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        organization_id,
        bank_account_id,
        transaction_date,
        description || null,
        reference_number || null,
        debit,
        credit,
        balance !== undefined ? balance : null,
        reconcilition_status,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Bank transaction recorded successfully.",
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

export const getAllBankTransactions = async (req, res) => {
  const { organization_id, bank_account_id } = req.query;
  try {
    let query = `SELECT * FROM bank_transactions WHERE 1=1`;
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

    if (bank_account_id) {
      if (!UUID_REGEX.test(bank_account_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid bank_account_id.",
        });
      }
      params.push(bank_account_id);
      query += ` AND bank_account_id = $${params.length}`;
    }

    query += ` ORDER BY transaction_date DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Bank transactions fetched successfully.",
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
