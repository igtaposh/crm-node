import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ENQUIRY_STATUSES = ["open", "qouted", "converted", "closed"];

export const createEnquiry = async (req, res) => {
  const {
    organization_id,
    lead_id,
    customer_id,
    assigned_to,
    enquiry_number,
    destination,
    travel_start_date,
    travel_end_date,
    adults,
    children,
    infants,
    budget,
    transport_required,
    hotel_required,
    special_requirements,
    status,
  } = req.body;

  try {
    if (
      !organization_id ||
      !enquiry_number ||
      adults === undefined ||
      children === undefined ||
      infants === undefined ||
      transport_required === undefined ||
      hotel_required === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organization_id, enquiry_number, adults, children, infants, transport_required, and hotel_required are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (lead_id && !UUID_REGEX.test(lead_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID.",
      });
    }

    if (customer_id && !UUID_REGEX.test(customer_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    if (assigned_to && !UUID_REGEX.test(assigned_to)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assigned_to user ID.",
      });
    }

    if (adults < 0 || children < 0 || infants < 0) {
      return res.status(400).json({
        success: false,
        message: "adults, children, and infants counts must be non-negative.",
      });
    }

    if (
      travel_start_date &&
      travel_end_date &&
      new Date(travel_end_date) < new Date(travel_start_date)
    ) {
      return res.status(400).json({
        success: false,
        message: "travel_end_date must be on or after travel_start_date.",
      });
    }

    const statusValue = status ?? "open";
    if (!ENQUIRY_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${ENQUIRY_STATUSES.join(", ")}`,
      });
    }

    const existing = await pool.query(
      `SELECT id FROM enquiries WHERE organization_id = $1 AND enquiry_number = $2`,
      [organization_id, enquiry_number],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Enquiry number already exists for this organization.",
      });
    }

    const result = await pool.query(
      `INSERT INTO enquiries
       (organization_id, lead_id, customer_id, assigned_to, enquiry_number, destination, travel_start_date, travel_end_date, adults, children, infants, budget, transport_required, hotel_required, special_requirements, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        organization_id,
        lead_id || null,
        customer_id || null,
        assigned_to || null,
        enquiry_number,
        destination || null,
        travel_start_date || null,
        travel_end_date || null,
        adults,
        children,
        infants,
        budget || null,
        Boolean(transport_required),
        Boolean(hotel_required),
        special_requirements || null,
        statusValue,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Enquiry created successfully.",
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

export const getAllEnquiries = async (req, res) => {
  const { organization_id, status } = req.query;
  try {
    let query = `SELECT * FROM enquiries WHERE 1=1`;
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

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Enquiries fetched successfully.",
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

export const getEnquiryById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID.",
      });
    }

    const result = await pool.query(`SELECT * FROM enquiries WHERE id = $1`, [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry fetched successfully.",
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

export const updateEnquiry = async (req, res) => {
  const { id } = req.params;
  const {
    lead_id,
    customer_id,
    assigned_to,
    destination,
    travel_start_date,
    travel_end_date,
    adults,
    children,
    infants,
    budget,
    transport_required,
    hotel_required,
    special_requirements,
    status,
  } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID.",
      });
    }

    if (lead_id && !UUID_REGEX.test(lead_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID.",
      });
    }

    if (customer_id && !UUID_REGEX.test(customer_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    if (assigned_to && !UUID_REGEX.test(assigned_to)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assigned_to ID.",
      });
    }

    if (status && !ENQUIRY_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${ENQUIRY_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `UPDATE enquiries
       SET lead_id = COALESCE($1, lead_id),
           customer_id = COALESCE($2, customer_id),
           assigned_to = COALESCE($3, assigned_to),
           destination = COALESCE($4, destination),
           travel_start_date = COALESCE($5, travel_start_date),
           travel_end_date = COALESCE($6, travel_end_date),
           adults = COALESCE($7, adults),
           children = COALESCE($8, children),
           infants = COALESCE($9, infants),
           budget = COALESCE($10, budget),
           transport_required = COALESCE($11, transport_required),
           hotel_required = COALESCE($12, hotel_required),
           special_requirements = COALESCE($13, special_requirements),
           status = COALESCE($14, status)
       WHERE id = $15
       RETURNING *`,
      [
        lead_id ?? null,
        customer_id ?? null,
        assigned_to ?? null,
        destination ?? null,
        travel_start_date ?? null,
        travel_end_date ?? null,
        adults ?? null,
        children ?? null,
        infants ?? null,
        budget ?? null,
        transport_required ?? null,
        hotel_required ?? null,
        special_requirements ?? null,
        status ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry updated successfully.",
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

export const deleteEnquiry = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM enquiries WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};
