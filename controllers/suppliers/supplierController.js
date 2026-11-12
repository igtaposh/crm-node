import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const SUPPLIER_TYPES = ["hotel", "cab", "restaurant", "activity", "other"];
const SUPPLIER_STATUSES = ["active", "inactive", "blocked"];

export const createSupplier = async (req, res) => {
  const {
    organization_id,
    supplier_code,
    supplier_type,
    name,
    contact_person,
    email,
    phone,
    gstin,
    address,
    city,
    state,
    bank_details_encrypted,
    status,
    contacts,
  } = req.body;

  try {
    if (!organization_id || !supplier_type || !name) {
      return res.status(400).json({
        success: false,
        message: "organization_id, supplier_type, and name are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (!SUPPLIER_TYPES.includes(supplier_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid supplier_type. Allowed: ${SUPPLIER_TYPES.join(", ")}`,
      });
    }

    const statusValue = status ?? "active";
    if (!SUPPLIER_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${SUPPLIER_STATUSES.join(", ")}`,
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

    if (gstin && !GSTIN_REGEX.test(gstin)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid GST number.",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const supplierResult = await client.query(
        `INSERT INTO suppliers
         (organization_id, supplier_code, supplier_type, name, contact_person, email, phone, gstin, address, city, state, bank_details_encrypted, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          organization_id,
          supplier_code || null,
          supplier_type,
          name,
          contact_person || null,
          email || null,
          phone || null,
          gstin || null,
          address || null,
          city || null,
          state || null,
          bank_details_encrypted ? JSON.stringify(bank_details_encrypted) : null,
          statusValue,
        ],
      );

      const supplier = supplierResult.rows[0];
      const insertedContacts = [];

      if (Array.isArray(contacts) && contacts.length > 0) {
        for (const contact of contacts) {
          if (!contact.name) continue;
          if (contact.email && !EMAIL_REGEX.test(contact.email)) continue;
          if (contact.phone && !PHONE_REGEX.test(contact.phone)) continue;

          const contactRes = await client.query(
            `INSERT INTO supplier_contacts (supplier_id, name, designation, email, phone)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
              supplier.id,
              contact.name,
              contact.designation || null,
              contact.email || null,
              contact.phone || null,
            ],
          );
          insertedContacts.push(contactRes.rows[0]);
        }
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Supplier created successfully.",
        data: {
          ...supplier,
          contacts: insertedContacts,
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

export const getAllSuppliers = async (req, res) => {
  const { organization_id, supplier_type, status } = req.query;
  try {
    let query = `SELECT * FROM suppliers WHERE 1=1`;
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

    if (supplier_type) {
      params.push(supplier_type);
      query += ` AND supplier_type = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY name ASC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Suppliers fetched successfully.",
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

export const getSupplierById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const supplierResult = await pool.query(
      `SELECT * FROM suppliers WHERE id = $1`,
      [id],
    );

    if (supplierResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    const contactsResult = await pool.query(
      `SELECT * FROM supplier_contacts WHERE supplier_id = $1`,
      [id],
    );

    return res.status(200).json({
      success: true,
      message: "Supplier fetched successfully.",
      data: {
        ...supplierResult.rows[0],
        contacts: contactsResult.rows,
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

export const updateSupplier = async (req, res) => {
  const { id } = req.params;
  const {
    supplier_code,
    supplier_type,
    name,
    contact_person,
    email,
    phone,
    gstin,
    address,
    city,
    state,
    bank_details_encrypted,
    status,
  } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    if (supplier_type && !SUPPLIER_TYPES.includes(supplier_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid supplier_type. Allowed: ${SUPPLIER_TYPES.join(", ")}`,
      });
    }

    if (status && !SUPPLIER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${SUPPLIER_STATUSES.join(", ")}`,
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

    if (gstin && !GSTIN_REGEX.test(gstin)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid GST number.",
      });
    }

    const result = await pool.query(
      `UPDATE suppliers
       SET supplier_code = COALESCE($1, supplier_code),
           supplier_type = COALESCE($2, supplier_type),
           name = COALESCE($3, name),
           contact_person = COALESCE($4, contact_person),
           email = COALESCE($5, email),
           phone = COALESCE($6, phone),
           gstin = COALESCE($7, gstin),
           address = COALESCE($8, address),
           city = COALESCE($9, city),
           state = COALESCE($10, state),
           bank_details_encrypted = COALESCE($11, bank_details_encrypted),
           status = COALESCE($12, status)
       WHERE id = $13
       RETURNING *`,
      [
        supplier_code ?? null,
        supplier_type ?? null,
        name ?? null,
        contact_person ?? null,
        email ?? null,
        phone ?? null,
        gstin ?? null,
        address ?? null,
        city ?? null,
        state ?? null,
        bank_details_encrypted ? JSON.stringify(bank_details_encrypted) : null,
        status ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully.",
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

export const deleteSupplier = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM suppliers WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supplier deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const addSupplierContact = async (req, res) => {
  const { id } = req.params;
  const { name, designation, email, phone } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Contact name is required.",
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

    const result = await pool.query(
      `INSERT INTO supplier_contacts (supplier_id, name, designation, email, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, name, designation || null, email || null, phone || null],
    );

    return res.status(201).json({
      success: true,
      message: "Supplier contact added successfully.",
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
