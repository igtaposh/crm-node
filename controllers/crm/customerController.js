import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const createCustomer = async (req, res) => {
  const {
    organization_id,
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
  } = req.body;

  try {
    if (!organization_id || !name) {
      return res.status(400).json({
        success: false,
        message: "organization_id and name are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
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
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const getAllCustomers = async (req, res) => {
  const { organization_id } = req.query;
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
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
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
      `SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL`,
      [id],
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
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
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
  } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const currentResult = await pool.query(
      `SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    const current = currentResult.rows[0];

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
       SET customer_code = COALESCE($1, customer_code),
           customer_type = COALESCE($2, customer_type),
           name = COALESCE($3, name),
           company_name = COALESCE($4, company_name),
           email = COALESCE($5, email),
           phone = COALESCE($6, phone),
           alternate_phone = COALESCE($7, alternate_phone),
           gstin = COALESCE($8, gstin),
           address = COALESCE($9, address),
           city = COALESCE($10, city),
           state = COALESCE($11, state),
           country = COALESCE($12, country),
           source = COALESCE($13, source),
           notes = COALESCE($14, notes),
           updated_at = NOW()
       WHERE id = $15 AND deleted_at IS NULL
       RETURNING *`,
      [
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
      ],
    );

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully.",
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
      `UPDATE customers SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id],
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
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};
