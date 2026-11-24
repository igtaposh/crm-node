import { pool, send_database_error } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VENDOR_BILL_STATUSES = [
  "draft",
  "received",
  "approved",
  "paid",
  "cancelled",
];

export const createVendorBill = async (req, res) => {
  const {
    supplier_id,
    booking_id,
    bill_number,
    bill_date,
    bill_due,
    taxable_amount,
    tax_amount,
    total_amount,
    status,
  } = req.body || {};
  const { organization_id } = req.user;

  try {
    if (
      !supplier_id ||
      !bill_number ||
      !bill_date ||
      taxable_amount === undefined ||
      tax_amount === undefined ||
      total_amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "supplier_id, bill_number, bill_date, taxable_amount, tax_amount, and total_amount are required.",
      });
    }

    if (!UUID_REGEX.test(supplier_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    if (booking_id && !UUID_REGEX.test(booking_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const statusValue = status ?? "received";
    if (!VENDOR_BILL_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${VENDOR_BILL_STATUSES.join(", ")}`,
      });
    }

    if (taxable_amount < 0 || tax_amount < 0 || total_amount < 0) {
      return res.status(400).json({
        success: false,
        message: "Amounts must be non-negative.",
      });
    }

    const result = await pool.query(
      `INSERT INTO vendor_bills
       (organization_id, supplier_id, booking_id, bill_number, bill_date, bill_due, taxable_amount, tax_amount, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        organization_id,
        supplier_id,
        booking_id || null,
        bill_number,
        bill_date,
        bill_due || null,
        taxable_amount,
        tax_amount,
        total_amount,
        statusValue,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Vendor bill created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const getAllVendorBills = async (req, res) => {
  const { supplier_id, status } = req.query;
  const { organization_id } = req.user;
  try {
    let query = `SELECT * FROM vendor_bills WHERE 1=1`;
    const params = [];

    params.push(organization_id);
    query += ` AND organization_id = $1`;

    if (supplier_id) {
      if (!UUID_REGEX.test(supplier_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid supplier ID.",
        });
      }
      params.push(supplier_id);
      query += ` AND supplier_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY bill_date DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Vendor bills fetched successfully.",
      data: result.rows,
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const getVendorBillById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor bill ID.",
      });
    }

    const result = await pool.query(
      `SELECT * FROM vendor_bills WHERE id = $1 AND organization_id = $2`,
      [id, req.user.organization_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor bill not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor bill fetched successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const updateVendorBill = async (req, res) => {
  const { id } = req.params;
  const {
    bill_number,
    bill_date,
    bill_due,
    taxable_amount,
    tax_amount,
    total_amount,
    status,
  } = req.body || {};

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor bill ID.",
      });
    }

    if (status && !VENDOR_BILL_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${VENDOR_BILL_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `UPDATE vendor_bills
       SET bill_number = COALESCE($1, bill_number),
           bill_date = COALESCE($2, bill_date),
           bill_due = COALESCE($3, bill_due),
           taxable_amount = COALESCE($4, taxable_amount),
           tax_amount = COALESCE($5, tax_amount),
           total_amount = COALESCE($6, total_amount),
           status = COALESCE($7, status)
       WHERE id = $8 AND organization_id = $9
       RETURNING *`, [
        bill_number ?? null,
        bill_date ?? null,
        bill_due ?? null,
        taxable_amount ?? null,
        tax_amount ?? null,
        total_amount ?? null,
        status ?? null,
        id,
        req.user.organization_id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor bill not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor bill updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const deleteVendorBill = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor bill ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM vendor_bills WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [id, req.user.organization_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor bill not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor bill deleted successfully.",
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};
