import { pool, send_database_error } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAYMENT_METHODS = ["cash", "upi", "bank", "card", "cheque", "gateway"];
const PAYMENT_TYPES = ["advance", "partial", "final", "other"];
const TRANSACTION_STATUSES = ["pending", "completed", "failed", "reversed"];

export const createPayment = async (req, res) => {
  const {
    customer_id,
    booking_id,
    receipt_number,
    payment_date,
    amount,
    currency,
    payment_method,
    transaction_reference,
    payment_type,
    status,
  } = req.body || {};
  const { organization_id } = req.user;

  const receiverId = req.user.id;

  try {
    if (
      !customer_id ||
      !receipt_number ||
      !payment_date ||
      amount === undefined ||
      !payment_method ||
      !payment_type
    ) {
      return res.status(400).json({
        success: false,
        message:
          "customer_id, receipt_number, payment_date, amount, payment_method, and payment_type are required.",
      });
    }

    if (!UUID_REGEX.test(customer_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    if (booking_id && !UUID_REGEX.test(booking_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    if (receiverId && !UUID_REGEX.test(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid received_by user ID.",
      });
    }

    if (!PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment_method. Allowed: ${PAYMENT_METHODS.join(", ")}`,
      });
    }

    if (!PAYMENT_TYPES.includes(payment_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment_type. Allowed: ${PAYMENT_TYPES.join(", ")}`,
      });
    }

    const statusValue = status ?? "pending";
    if (!TRANSACTION_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${TRANSACTION_STATUSES.join(", ")}`,
      });
    }

    if (amount < 0) {
      return res.status(400).json({
        success: false,
        message: "amount must be non-negative.",
      });
    }

    const result = await pool.query(
      `INSERT INTO payments 
       (organization_id, customer_id, booking_id, receipt_number, payment_date, amount, currency, payment_method, transaction_reference, payment_type, status, received_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        organization_id,
        customer_id,
        booking_id || null,
        receipt_number,
        payment_date,
        amount,
        currency ? currency.toLowerCase() : "inr",
        payment_method,
        transaction_reference || null,
        payment_type,
        statusValue,
        receiverId || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Payment created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const getAllPayments = async (req, res) => {
  const { customer_id, booking_id, status } = req.query;
  const { organization_id } = req.user;
  try {
    let query = `SELECT * FROM payments WHERE 1=1`;
    const params = [];

    params.push(organization_id);
    query += ` AND organization_id = $1`;

    if (customer_id) {
      if (!UUID_REGEX.test(customer_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID.",
        });
      }
      params.push(customer_id);
      query += ` AND customer_id = $${params.length}`;
    }

    if (booking_id) {
      if (!UUID_REGEX.test(booking_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID.",
        });
      }
      params.push(booking_id);
      query += ` AND booking_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY payment_date DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Payments fetched successfully.",
      data: result.rows,
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const getPaymentById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const paymentResult = await pool.query(
      `SELECT * FROM payments WHERE id = $1 AND organization_id = $2`,
      [id, req.user.organization_id],
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    const allocationsResult = await pool.query(
      `SELECT * FROM payment_allocations WHERE payment_id = $1 AND organization_id = $2`,
      [id, req.user.organization_id],
    );

    return res.status(200).json({
      success: true,
      message: "Payment fetched successfully.",
      data: {
        ...paymentResult.rows[0],
        allocations: allocationsResult.rows,
      },
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const updatePayment = async (req, res) => {
  const { id } = req.params;
  const { status, transaction_reference } = req.body || {};

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    if (status && !TRANSACTION_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${TRANSACTION_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `UPDATE payments
       SET status = COALESCE($1, status),
           transaction_reference = COALESCE($2, transaction_reference)
       WHERE id = $3 AND organization_id = $4
       RETURNING *`,
      [status ?? null, transaction_reference ?? null, id, req.user.organization_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const allocatePayment = async (req, res) => {
  const { id } = req.params;
  const { allocation_amount } = req.body || {};
  const { organization_id } = req.user;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    if (allocation_amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "allocation_amount are required.",
      });
    }

    if (!/^\d+(?:\.\d{1,2})?$/.test(String(allocation_amount)) || Number(allocation_amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "allocation_amount must be a positive amount with up to two decimal places.",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const payment = await client.query(
        "SELECT id FROM payments WHERE organization_id = $1 AND id = $2 FOR UPDATE",
        [organization_id, id],
      );
      if (!payment.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Payment not found." });
      }

      const result = await client.query(
        `INSERT INTO payment_allocations (organization_id, payment_id, allocation_amount)
         SELECT $1, $2, $3
         FROM payments p
         WHERE p.id = $2 AND p.organization_id = $1
           AND $3::numeric <= p.amount - COALESCE((
             SELECT SUM(allocation_amount) FROM payment_allocations
             WHERE organization_id = $1 AND payment_id = $2
           ), 0)
         RETURNING *`,
        [organization_id, id, allocation_amount],
      );

      if (!result.rowCount) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Allocation exceeds the available balance or the supplier does not match." });
      }
      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Payment allocation recorded successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return send_database_error(res, error);
  }
};
