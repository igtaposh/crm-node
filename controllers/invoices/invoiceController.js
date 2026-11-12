import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INVOICE_STATUSES = ["draft", "issued", "partial", "paid", "cancelled"];

export const createInvoice = async (req, res) => {
  const {
    organization_id,
    branch_id,
    booking_id,
    customer_id,
    invoice_number,
    invoice_date,
    due_date,
    place_of_supply,
    taxable_amount,
    cgst,
    sgst,
    igst,
    cess,
    total_amount,
    status,
    items,
  } = req.body;

  try {
    if (
      !organization_id ||
      !customer_id ||
      !invoice_number ||
      !invoice_date ||
      taxable_amount === undefined ||
      total_amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organization_id, customer_id, invoice_number, invoice_date, taxable_amount, and total_amount are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (!UUID_REGEX.test(customer_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
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

    const statusValue = status ?? "issued";
    if (!INVOICE_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${INVOICE_STATUSES.join(", ")}`,
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const invoiceResult = await client.query(
        `INSERT INTO invoices
         (organization_id, branch_id, booking_id, customer_id, invoice_number, invoice_date, due_date, place_of_supply, taxable_amount, cgst, sgst, igst, cess, total_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          organization_id,
          branch_id || null,
          booking_id || null,
          customer_id,
          invoice_number,
          invoice_date,
          due_date || null,
          place_of_supply || null,
          taxable_amount,
          cgst || 0,
          sgst || 0,
          igst || 0,
          cess || 0,
          total_amount,
          statusValue,
        ],
      );

      const invoice = invoiceResult.rows[0];
      const insertedItems = [];

      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          if (!item.description) continue;

          const itemResult = await client.query(
            `INSERT INTO invoice_items
             (invoice_id, description, hsn_sac_code, quantity, rate, taxable_amount, tax_rate, tax_amount, total_amount)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
              invoice.id,
              item.description,
              item.hsn_sac_code || null,
              item.quantity || 1,
              item.rate || 0,
              item.taxable_amount || 0,
              item.tax_rate || 0,
              item.tax_amount || 0,
              item.total_amount || 0,
            ],
          );
          insertedItems.push(itemResult.rows[0]);
        }
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Invoice created successfully.",
        data: {
          ...invoice,
          items: insertedItems,
        },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const getAllInvoices = async (req, res) => {
  const { organization_id, customer_id, booking_id, status } = req.query;
  try {
    let query = `SELECT * FROM invoices WHERE 1=1`;
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

    query += ` ORDER BY invoice_date DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Invoices fetched successfully.",
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

export const getInvoiceById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID.",
      });
    }

    const invoiceResult = await pool.query(
      `SELECT * FROM invoices WHERE id = $1`,
      [id],
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found.",
      });
    }

    const itemsResult = await pool.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1`,
      [id],
    );

    return res.status(200).json({
      success: true,
      message: "Invoice fetched successfully.",
      data: {
        ...invoiceResult.rows[0],
        items: itemsResult.rows,
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

export const updateInvoiceStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID.",
      });
    }

    if (!status || !INVOICE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${INVOICE_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `UPDATE invoices SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice status updated successfully.",
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

export const deleteInvoice = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM invoices WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};
