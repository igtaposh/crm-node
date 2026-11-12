import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUOTATION_STATUSES = ["draft", "sent", "accepted", "rejected", "expired"];
const SERVICE_TYPES = ["hotel", "cab", "package", "activity", "other"];

export const createQuotation = async (req, res) => {
  const {
    organization_id,
    qoutaion_number,
    enquiry_id,
    customer_id,
    prepared_by,
    version,
    valid_until,
    subtotal,
    discount,
    taxable_amount,
    tax_amount,
    total_amount,
    currency,
    status,
    terms,
    items,
  } = req.body;

  const preparerId = prepared_by || req.user?.id;

  try {
    if (
      !organization_id ||
      !qoutaion_number ||
      !customer_id ||
      subtotal === undefined ||
      discount === undefined ||
      taxable_amount === undefined ||
      tax_amount === undefined ||
      total_amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organization_id, qoutaion_number, customer_id, subtotal, discount, taxable_amount, tax_amount, and total_amount are required.",
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

    if (enquiry_id && !UUID_REGEX.test(enquiry_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID.",
      });
    }

    if (preparerId && !UUID_REGEX.test(preparerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid prepared_by user ID.",
      });
    }

    const statusValue = status ?? "sent";
    if (!QUOTATION_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${QUOTATION_STATUSES.join(", ")}`,
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const quotationResult = await client.query(
        `INSERT INTO qoutations 
         (organization_id, qoutaion_number, enquiry_id, customer_id, prepared_by, version, valid_until, subtotal, discount, taxable_amount, tax_amount, total_amount, currency, status, terms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          organization_id,
          qoutaion_number,
          enquiry_id || null,
          customer_id,
          preparerId || null,
          version !== undefined ? version : 1,
          valid_until || null,
          subtotal,
          discount,
          taxable_amount,
          tax_amount,
          total_amount,
          currency ? currency.toLowerCase() : "inr",
          statusValue,
          terms || null,
        ],
      );

      const quotation = quotationResult.rows[0];
      const insertedItems = [];

      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          if (!item.description || !item.service_type) continue;
          if (!SERVICE_TYPES.includes(item.service_type)) continue;

          const itemResult = await client.query(
            `INSERT INTO qoutation_items 
             (qoutation_id, description, service_type, quantity, unit_price, discount, tax_rate, total_amount)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
              quotation.id,
              item.description,
              item.service_type,
              item.quantity || 1,
              item.unit_price || 0,
              item.discount || 0,
              item.tax_rate || 0,
              item.total_amount || 0,
            ],
          );
          insertedItems.push(itemResult.rows[0]);
        }
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Quotation created successfully.",
        data: {
          ...quotation,
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

export const getAllQuotations = async (req, res) => {
  const { organization_id, customer_id, status } = req.query;
  try {
    let query = `SELECT * FROM qoutations WHERE 1=1`;
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

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Quotations fetched successfully.",
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

export const getQuotationById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID.",
      });
    }

    const quotationResult = await pool.query(
      `SELECT * FROM qoutations WHERE id = $1`,
      [id],
    );

    if (quotationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found.",
      });
    }

    const itemsResult = await pool.query(
      `SELECT * FROM qoutation_items WHERE qoutation_id = $1`,
      [id],
    );

    return res.status(200).json({
      success: true,
      message: "Quotation fetched successfully.",
      data: {
        ...quotationResult.rows[0],
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

export const updateQuotation = async (req, res) => {
  const { id } = req.params;
  const {
    valid_until,
    subtotal,
    discount,
    taxable_amount,
    tax_amount,
    total_amount,
    status,
    terms,
  } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID.",
      });
    }

    if (status && !QUOTATION_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${QUOTATION_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `UPDATE qoutations
       SET valid_until = COALESCE($1, valid_until),
           subtotal = COALESCE($2, subtotal),
           discount = COALESCE($3, discount),
           taxable_amount = COALESCE($4, taxable_amount),
           tax_amount = COALESCE($5, tax_amount),
           total_amount = COALESCE($6, total_amount),
           status = COALESCE($7, status),
           terms = COALESCE($8, terms)
       WHERE id = $9
       RETURNING *`,
      [
        valid_until ?? null,
        subtotal ?? null,
        discount ?? null,
        taxable_amount ?? null,
        tax_amount ?? null,
        total_amount ?? null,
        status ?? null,
        terms ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Quotation updated successfully.",
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

export const deleteQuotation = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM qoutations WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Quotation deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};
