import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CREDIT_NOTE_STATUSES = ["draft", "issued", "cancelled"];
const VENDOR_CREDIT_STATUSES = ["draft", "approved", "applied", "cancelled"];

export const createCreditNote = async (req, res) => {
  const {
    organization_id,
    invoice_id,
    credit_note_number,
    issue_date,
    reason,
    taxable_amount,
    tax_amount,
    total_amount,
    status,
  } = req.body;

  try {
    if (
      !organization_id ||
      !invoice_id ||
      !credit_note_number ||
      !issue_date ||
      taxable_amount === undefined ||
      tax_amount === undefined ||
      total_amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organization_id, invoice_id, credit_note_number, issue_date, taxable_amount, tax_amount, and total_amount are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (!UUID_REGEX.test(invoice_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID.",
      });
    }

    const statusValue = status ?? "issued";
    if (!CREDIT_NOTE_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${CREDIT_NOTE_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `INSERT INTO credit_notes
       (organization_id, invoice_id, credit_note_number, issue_date, reason, taxable_amount, tax_amount, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        organization_id,
        invoice_id,
        credit_note_number,
        issue_date,
        reason || null,
        taxable_amount,
        tax_amount,
        total_amount,
        statusValue,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Credit note created successfully.",
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

export const getAllCreditNotes = async (req, res) => {
  const { organization_id, invoice_id } = req.query;
  try {
    let query = `SELECT * FROM credit_notes WHERE 1=1`;
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

    if (invoice_id) {
      if (!UUID_REGEX.test(invoice_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID.",
        });
      }
      params.push(invoice_id);
      query += ` AND invoice_id = $${params.length}`;
    }

    query += ` ORDER BY issue_date DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Credit notes fetched successfully.",
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

export const getCreditNoteById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid credit note ID.",
      });
    }

    const result = await pool.query(
      `SELECT * FROM credit_notes WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Credit note not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Credit note fetched successfully.",
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

export const createVendorCredit = async (req, res) => {
  const {
    organization_id,
    supplier_id,
    vendor_bill_id,
    credit_note_number,
    issue_date,
    reason,
    taxable_amount,
    tax_amount,
    total_amount,
    status,
  } = req.body;

  try {
    if (
      !organization_id ||
      !supplier_id ||
      !credit_note_number ||
      !issue_date ||
      taxable_amount === undefined ||
      tax_amount === undefined ||
      total_amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organization_id, supplier_id, credit_note_number, issue_date, taxable_amount, tax_amount, and total_amount are required.",
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

    if (vendor_bill_id && !UUID_REGEX.test(vendor_bill_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor_bill_id.",
      });
    }

    const statusValue = status ?? "approved";
    if (!VENDOR_CREDIT_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${VENDOR_CREDIT_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `INSERT INTO vendor_credits
       (organization_id, supplier_id, vendor_bill_id, credit_note_number, issue_date, reason, taxable_amount, tax_amount, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        organization_id,
        supplier_id,
        vendor_bill_id || null,
        credit_note_number,
        issue_date,
        reason || null,
        taxable_amount,
        tax_amount,
        total_amount,
        statusValue,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Vendor credit created successfully.",
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

export const getAllVendorCredits = async (req, res) => {
  const { organization_id, supplier_id } = req.query;
  try {
    let query = `SELECT * FROM vendor_credits WHERE 1=1`;
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

    query += ` ORDER BY issue_date DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Vendor credits fetched successfully.",
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

export const getVendorCreditById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor credit ID.",
      });
    }

    const result = await pool.query(
      `SELECT * FROM vendor_credits WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor credit not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor credit fetched successfully.",
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
