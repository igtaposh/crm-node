import { pool, send_database_error } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const createCustomer = async (req, res) => {
  const {
    customer_code,
    customer_type,
    name,
    company_name,
    email,
    phone,
    alternate_phone,
    gstin,
    address,
    city,
    state,
    country,
    source,
    notes,
  } = req.body || {};
  const { organization_id } = req.user;

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "name are required.",
      });
    }

    const typeValue = customer_type ?? "individual";
    if (!["individual", "corporate", "agent"].includes(typeValue)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer_type. Allowed: individual, corporate, agent.",
      });
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid email.",
      });
    }

    if (phone && !PHONE_REGEX.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid 10-digit phone number starting with 6-9.",
      });
    }

    if (alternate_phone && !PHONE_REGEX.test(alternate_phone)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter valid 10-digit alternate phone number starting with 6-9.",
      });
    }

    if (gstin && !GSTIN_REGEX.test(gstin)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid GST number.",
      });
    }

    if (customer_code) {
      const existing = await pool.query(
        `SELECT id FROM customers WHERE organization_id = $1 AND customer_code = $2 AND deleted_at IS NULL`,
        [organization_id, customer_code],
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Customer code already exists for this organization.",
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO customers 
       (organization_id, customer_code, customer_type, name, company_name, email, phone, alternate_phone, gstin, address, city, state, country, source, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        organization_id,
        customer_code || null,
        typeValue,
        name,
        company_name || null,
        email || null,
        phone || null,
        alternate_phone || null,
        gstin || null,
        address || null,
        city || null,
        state || null,
        country || "INDIA",
        source || null,
        notes || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const getAllCustomers = async (req, res) => {
  const { organization_id } = req.user;
  try {
    let query = `SELECT * FROM customers WHERE deleted_at IS NULL`;
    const params = [];

    if (organization_id) {
      if (!UUID_REGEX.test(organization_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid organization ID.",
        });
      }
      query += ` AND organization_id = $1`;
      params.push(organization_id);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Customers fetched successfully.",
      data: result.rows,
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const getCustomerById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const result = await pool.query(
      `SELECT * FROM customers WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [id, req.user.organization_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer fetched successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const updateCustomer = async (req, res) => {
  const { id } = req.params;
  const {
    customer_code,
    customer_type,
    name,
    company_name,
    email,
    phone,
    alternate_phone,
    gstin,
    address,
    city,
    state,
    country,
    source,
    notes,
  } = req.body || {};

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const currentResult = await pool.query(
      `SELECT * FROM customers WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [id, req.user.organization_id],
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }


    if (
      customer_type &&
      !["individual", "corporate", "agent"].includes(customer_type)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer_type. Allowed: individual, corporate, agent.",
      });
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid email.",
      });
    }

    if (phone && !PHONE_REGEX.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid phone.",
      });
    }

    if (alternate_phone && !PHONE_REGEX.test(alternate_phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid alternate phone.",
      });
    }

    if (gstin && !GSTIN_REGEX.test(gstin)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid GST number.",
      });
    }

    const result = await pool.query(
      `UPDATE customers
       SET customer_code = CASE WHEN $1 = '' THEN NULL ELSE COALESCE($1, customer_code) END,
           customer_type = COALESCE($2, customer_type),
           name = COALESCE($3, name),
           company_name = CASE WHEN $4 = '' THEN NULL ELSE COALESCE($4, company_name) END,
           email = CASE WHEN $5 = '' THEN NULL ELSE COALESCE($5, email) END,
           phone = CASE WHEN $6 = '' THEN NULL ELSE COALESCE($6, phone) END,
           alternate_phone = CASE WHEN $7 = '' THEN NULL ELSE COALESCE($7, alternate_phone) END,
           gstin = CASE WHEN $8 = '' THEN NULL ELSE COALESCE($8, gstin) END,
           address = CASE WHEN $9 = '' THEN NULL ELSE COALESCE($9, address) END,
           city = CASE WHEN $10 = '' THEN NULL ELSE COALESCE($10, city) END,
           state = CASE WHEN $11 = '' THEN NULL ELSE COALESCE($11, state) END,
           country = CASE WHEN $12 = '' THEN NULL ELSE COALESCE($12, country) END,
           source = CASE WHEN $13 = '' THEN NULL ELSE COALESCE($13, source) END,
           notes = CASE WHEN $14 = '' THEN NULL ELSE COALESCE($14, notes) END,
           updated_at = NOW()
       WHERE id = $15 AND organization_id = $16 AND deleted_at IS NULL
       RETURNING *`, [
        customer_code ?? null,
        customer_type ?? null,
        name ?? null,
        company_name ?? null,
        email ?? null,
        phone ?? null,
        alternate_phone ?? null,
        gstin ?? null,
        address ?? null,
        city ?? null,
        state ?? null,
        country ?? null,
        source ?? null,
        notes ?? null,
        id,
        req.user.organization_id,
      ],
    );

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const result = await pool.query(
      `UPDATE customers SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL RETURNING id`,
      [id, req.user.organization_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully.",
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};
