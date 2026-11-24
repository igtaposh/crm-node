import { pool, send_database_error } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFUND_METHODS = ["original-method", "cash", "bank", "upi"];
const REFUND_STATUSES = ["pending", "approved", "processed", "rejected"];

export const createRefund = async (req, res) => {
  const {
    booking_id,
    payment_id,
    refund_number,
    payment_date,
    amount,
    reason,
    refund_method,
    status,
  } = req.body || {};
  const { organization_id } = req.user;

  try {
    if (
      !booking_id ||
      !refund_number ||
      amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "booking_id, refund_number, and amount are required.",
      });
    }

    if (!UUID_REGEX.test(booking_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    if (payment_id && !UUID_REGEX.test(payment_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const method = refund_method ?? "original-method";
    if (!REFUND_METHODS.includes(method)) {
      return res.status(400).json({
        success: false,
        message: `Invalid refund_method. Allowed: ${REFUND_METHODS.join(", ")}`,
      });
    }

    const statusValue = status ?? "pending";
    if (!REFUND_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${REFUND_STATUSES.join(", ")}`,
      });
    }

    if (amount < 0) {
      return res.status(400).json({
        success: false,
        message: "amount must be non-negative.",
      });
    }

    const result = await pool.query(
      `INSERT INTO refunds
       (organization_id, booking_id, payment_id, refund_number, payment_date, amount, reason, refund_method, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        organization_id,
        booking_id,
        payment_id || null,
        refund_number,
        payment_date || null,
        amount,
        reason || null,
        method,
        statusValue,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Refund recorded successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const getAllRefunds = async (req, res) => {
  const { booking_id, status } = req.query;
  const { organization_id } = req.user;
  try {
    let query = `SELECT * FROM refunds WHERE 1=1`;
    const params = [];

    params.push(organization_id);
    query += ` AND organization_id = $1`;

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

    query += ` ORDER BY payment_date DESC NULLS LAST`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Refunds fetched successfully.",
      data: result.rows,
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const getRefundById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid refund ID.",
      });
    }

    const result = await pool.query(`SELECT * FROM refunds WHERE id = $1 AND organization_id = $2`, [
      id,
        req.user.organization_id,
      ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refund not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Refund fetched successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const updateRefundStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid refund ID.",
      });
    }

    if (!status || !REFUND_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${REFUND_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `UPDATE refunds SET status = $1 WHERE id = $2 AND organization_id = $3 RETURNING *`,
      [status, id, req.user.organization_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refund not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Refund status updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};
