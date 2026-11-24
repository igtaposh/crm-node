import { pool, send_database_error } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUPPLIER_PAYMENT_METHODS = ["cash", "upi", "bank", "cheque"];
const SUPPLIER_PAYMENT_STATUSES = ["pending", "completed", "reversed"];

export const createSupplierPayment = async (req, res) => {
  const {
    supplier_id,
    payment_number,
    payment_date,
    amount,
    currency,
    payment_method,
    transaction_reference,
    status,
  } = req.body || {};
  const { organization_id } = req.user;

  try {
    if (
      !supplier_id ||
      !payment_number ||
      !payment_date ||
      amount === undefined ||
      !payment_method
    ) {
      return res.status(400).json({
        success: false,
        message:
          "supplier_id, payment_number, payment_date, amount, and payment_method are required.",
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
    return send_database_error(res, error);
  }
};

export const getAllSupplierPayments = async (req, res) => {
  const { supplier_id, status } = req.query;
  const { organization_id } = req.user;
  try {
    let query = `SELECT * FROM supplier_payments WHERE 1=1`;
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

    query += ` ORDER BY payment_date DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Supplier payments fetched successfully.",
      data: result.rows,
    });
  } catch (error) {
    return send_database_error(res, error);
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
      `SELECT * FROM supplier_payments WHERE id = $1 AND organization_id = $2`,
      [id, req.user.organization_id],
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier payment not found.",
      });
    }

    const allocationsResult = await pool.query(
      `SELECT * FROM supplier_payment_allocations WHERE supplier_payment_id = $1 AND organization_id = $2`,
      [id, req.user.organization_id],
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
    return send_database_error(res, error);
  }
};

export const allocateSupplierPayment = async (req, res) => {
  const { id } = req.params;
  const { vendor_bill_id, allocated_amount } = req.body || {};
  const { organization_id } = req.user;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier payment ID.",
      });
    }

    if (
      !vendor_bill_id ||
      allocated_amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "vendor_bill_id, and allocated_amount are required.",
      });
    }

    if (!UUID_REGEX.test(vendor_bill_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor_bill_id.",
      });
    }

    if (!/^\d+(?:\.\d{1,2})?$/.test(String(allocated_amount)) || Number(allocated_amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "allocated_amount must be a positive amount with up to two decimal places.",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const payment = await client.query(
        "SELECT id FROM supplier_payments WHERE organization_id = $1 AND id = $2 FOR UPDATE",
        [organization_id, id],
      );
      if (!payment.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Payment not found." });
      }

      const bill = await client.query(
        "SELECT id FROM vendor_bills WHERE organization_id = $1 AND id = $2 FOR UPDATE",
        [organization_id, vendor_bill_id],
      );
      if (!bill.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Vendor bill not found." });
      }

      const result = await client.query(
        `INSERT INTO supplier_payment_allocations
         (organization_id, supplier_payment_id, vendor_bill_id, allocated_amount)
         SELECT $1, $2, $3, $4
         FROM supplier_payments p
         JOIN vendor_bills b ON b.id = $3 AND b.organization_id = p.organization_id
           AND b.supplier_id = p.supplier_id
         WHERE p.id = $2 AND p.organization_id = $1
           AND $4::numeric <= p.amount - COALESCE((
             SELECT SUM(allocated_amount) FROM supplier_payment_allocations
             WHERE organization_id = $1 AND supplier_payment_id = $2
           ), 0)
           AND $4::numeric <= b.total_amount - COALESCE((
             SELECT SUM(allocated_amount) FROM supplier_payment_allocations
             WHERE organization_id = $1 AND vendor_bill_id = $3
           ), 0)
         RETURNING *`,
        [organization_id, id, vendor_bill_id, allocated_amount],
      );

      if (!result.rowCount) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Allocation exceeds the available balance or the supplier does not match." });
      }
      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Supplier payment allocation recorded successfully.",
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
