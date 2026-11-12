import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUPPLIER_PAYMENT_METHODS = ["cash", "upi", "bank", "cheque"];
const SUPPLIER_PAYMENT_STATUSES = ["pending", "completed", "reversed"];

export const createSupplierPayment = async (req, res) => {
  const {
    organization_id,
    supplier_id,
    payment_number,
    payment_date,
    amount,
    currency,
    payment_method,
    transaction_reference,
    status,
  } = req.body;

  try {
    if (
      !organization_id ||
      !supplier_id ||
      !payment_number ||
      !payment_date ||
      amount === undefined ||
      !payment_method
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organization_id, supplier_id, payment_number, payment_date, amount, and payment_method are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (!UUID_REGEX.test(supplier_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    if (!SUPPLIER_PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment_method. Allowed: ${SUPPLIER_PAYMENT_METHODS.join(", ")}`,
      });
    }

    const statusValue = status ?? "pending";
    if (!SUPPLIER_PAYMENT_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${SUPPLIER_PAYMENT_STATUSES.join(", ")}`,
      });
    }

    if (amount < 0) {
      return res.status(400).json({
        success: false,
        message: "amount must be non-negative.",
      });
    }

    const result = await pool.query(
      `INSERT INTO supplier_payments
       (organization_id, supplier_id, payment_number, payment_date, amount, currency, payment_method, transaction_reference, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        organization_id,
        supplier_id,
        payment_number,
        payment_date,
        amount,
        currency ? currency.toLowerCase() : "inr",
        payment_method,
        transaction_reference || null,
        statusValue,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Supplier payment recorded successfully.",
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

export const getAllSupplierPayments = async (req, res) => {
  const { organization_id, supplier_id, status } = req.query;
  try {
    let query = `SELECT * FROM supplier_payments WHERE 1=1`;
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

    query += ` ORDER BY payment_date DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Supplier payments fetched successfully.",
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

export const getSupplierPaymentById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier payment ID.",
      });
    }

    const paymentResult = await pool.query(
      `SELECT * FROM supplier_payments WHERE id = $1`,
      [id],
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier payment not found.",
      });
    }

    const allocationsResult = await pool.query(
      `SELECT * FROM supplier_payment_allocations WHERE supplier_payment_id = $1`,
      [id],
    );

    return res.status(200).json({
      success: true,
      message: "Supplier payment fetched successfully.",
      data: {
        ...paymentResult.rows[0],
        allocations: allocationsResult.rows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const allocateSupplierPayment = async (req, res) => {
  const { id } = req.params;
  const { organization_id, vendor_bill_id, allocated_amount } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier payment ID.",
      });
    }

    if (
      !organization_id ||
      !vendor_bill_id ||
      allocated_amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organization_id, vendor_bill_id, and allocated_amount are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (!UUID_REGEX.test(vendor_bill_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor_bill_id.",
      });
    }

    if (allocated_amount < 0) {
      return res.status(400).json({
        success: false,
        message: "allocated_amount must be non-negative.",
      });
    }

    const result = await pool.query(
      `INSERT INTO supplier_payment_allocations
       (organization_id, supplier_payment_id, vendor_bill_id, allocated_amount)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [organization_id, id, vendor_bill_id, allocated_amount],
    );

    return res.status(201).json({
      success: true,
      message: "Supplier payment allocation recorded successfully.",
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
