import { pool, send_database_error } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXPENSE_CATEGORIES = [
  "hotel",
  "cab",
  "food",
  "office",
  "marketing",
  "other",
];
const EXPENSE_PAYMENT_STATUSES = ["unpaid", "partial", "paid"];

export const createExpense = async (req, res) => {
  const {
    branch_id,
    booking_id,
    supplier_id,
    expense_number,
    expense_date,
    category,
    description,
    amount,
    tax_amount,
    payment_status,
    approoved_by,
  } = req.body || {};
  const { organization_id } = req.user;

  try {
    if (
      !expense_date ||
      !category ||
      amount === undefined ||
      tax_amount === undefined ||
      !payment_status
    ) {
      return res.status(400).json({
        success: false,
        message:
          "expense_date, category, amount, tax_amount, and payment_status are required.",
      });
    }

    if (branch_id && !UUID_REGEX.test(branch_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    if (booking_id && !UUID_REGEX.test(booking_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    if (supplier_id && !UUID_REGEX.test(supplier_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    if (!EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Allowed: ${EXPENSE_CATEGORIES.join(", ")}`,
      });
    }

    if (!EXPENSE_PAYMENT_STATUSES.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment_status. Allowed: ${EXPENSE_PAYMENT_STATUSES.join(", ")}`,
      });
    }

    if (amount < 0 || tax_amount < 0) {
      return res.status(400).json({
        success: false,
        message: "amount and tax_amount must be non-negative.",
      });
    }

    if (approoved_by && req.role !== "admin" &&
        !req.permissions.some((permission) => permission.module === "finance" && permission.action === "approve")) {
      return res.status(403).json({ success: false, message: "Permission to approve expenses is required." });
    }

    const result = await pool.query(
      `INSERT INTO expenses
       (organization_id, branch_id, booking_id, supplier_id, expense_number, expense_date, category, description, amount, tax_amount, payment_status, approoved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        organization_id,
        branch_id || null,
        booking_id || null,
        supplier_id || null,
        expense_number || null,
        expense_date,
        category,
        description || null,
        amount,
        tax_amount,
        payment_status,
        approoved_by ? req.user.id : null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Expense created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const getAllExpenses = async (req, res) => {
  const { category, payment_status } = req.query;
  const { organization_id } = req.user;
  try {
    let query = `SELECT * FROM expenses WHERE 1=1`;
    const params = [];

    params.push(organization_id);
    query += ` AND organization_id = $1`;

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (payment_status) {
      params.push(payment_status);
      query += ` AND payment_status = $${params.length}`;
    }

    query += ` ORDER BY expense_date DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Expenses fetched successfully.",
      data: result.rows,
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const getExpenseById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID.",
      });
    }

    const result = await pool.query(`SELECT * FROM expenses WHERE id = $1 AND organization_id = $2`, [
      id,
        req.user.organization_id,
      ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Expense fetched successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const updateExpense = async (req, res) => {
  const { id } = req.params;
  const {
    expense_number,
    expense_date,
    category,
    description,
    amount,
    tax_amount,
    payment_status,
    approoved_by,
  } = req.body || {};

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID.",
      });
    }

    if (category && !EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Allowed: ${EXPENSE_CATEGORIES.join(", ")}`,
      });
    }

    if (payment_status && !EXPENSE_PAYMENT_STATUSES.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment_status. Allowed: ${EXPENSE_PAYMENT_STATUSES.join(", ")}`,
      });
    }

    if (approoved_by && req.role !== "admin" &&
        !req.permissions.some((permission) => permission.module === "finance" && permission.action === "approve")) {
      return res.status(403).json({ success: false, message: "Permission to approve expenses is required." });
    }

    const result = await pool.query(
      `UPDATE expenses
       SET expense_number = COALESCE($1, expense_number),
           expense_date = COALESCE($2, expense_date),
           category = COALESCE($3, category),
           description = COALESCE($4, description),
           amount = COALESCE($5, amount),
           tax_amount = COALESCE($6, tax_amount),
           payment_status = COALESCE($7, payment_status),
           approoved_by = COALESCE($8, approoved_by)
       WHERE id = $9 AND organization_id = $10
       RETURNING *`, [
        expense_number ?? null,
        expense_date ?? null,
        category ?? null,
        description ?? null,
        amount ?? null,
        tax_amount ?? null,
        payment_status ?? null,
        approoved_by ? req.user.id : null,
        id,
        req.user.organization_id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const deleteExpense = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM expenses WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [id, req.user.organization_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully.",
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};
