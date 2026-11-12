import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

const SOURCE_TYPES = [
  "website",
  "whatsapp",
  "refferal",
  "social",
  "walk-in",
  "other",
];
const STATUS_TYPES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "converted",
  "lost",
];
const PRIORITY_TYPES = ["low", "medium", "high", "urgent"];
const ACTIVITY_TYPES = ["call", "email", "whatsapp", "meeting", "note"];

export const createLead = async (req, res) => {
  const {
    organization_id,
    customer_id,
    assigned_to,
    lead_name,
    phone,
    email,
    source,
    destination,
    expected_budget,
    travel_date,
    status,
    priority,
    next_follow_up,
    lost_reason,
  } = req.body;

  try {
    if (!organization_id || !lead_name) {
      return res.status(400).json({
        success: false,
        message: "organization_id and lead_name are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
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

    if (source && !SOURCE_TYPES.includes(source)) {
      return res.status(400).json({
        success: false,
        message: `Invalid source. Allowed: ${SOURCE_TYPES.join(", ")}`,
      });
    }

    const statusValue = status ?? "new";
    if (!STATUS_TYPES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${STATUS_TYPES.join(", ")}`,
      });
    }

    const priorityValue = priority ?? "medium";
    if (!PRIORITY_TYPES.includes(priorityValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Allowed: ${PRIORITY_TYPES.join(", ")}`,
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
      `INSERT INTO leads
       (organization_id, customer_id, assigned_to, lead_name, phone, email, source, destination, expected_budget, travel_date, status, priority, next_follow_up, lost_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        organization_id,
        customer_id || null,
        assigned_to || null,
        lead_name,
        phone || null,
        email || null,
        source || null,
        destination || null,
        expected_budget || null,
        travel_date || null,
        statusValue,
        priorityValue,
        next_follow_up || null,
        lost_reason || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Lead created successfully.",
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

export const getAllLeads = async (req, res) => {
  const { organization_id, status, assigned_to } = req.query;
  try {
    let query = `SELECT * FROM leads WHERE 1=1`;
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

    if (assigned_to) {
      if (!UUID_REGEX.test(assigned_to)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned_to ID.",
        });
      }
      params.push(assigned_to);
      query += ` AND assigned_to = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Leads fetched successfully.",
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

export const getLeadById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID.",
      });
    }

    const leadResult = await pool.query(`SELECT * FROM leads WHERE id = $1`, [
      id,
    ]);

    if (leadResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    const activitiesResult = await pool.query(
      `SELECT * FROM lead_activities WHERE lead_id = $1 ORDER BY activity_date DESC`,
      [id],
    );

    return res.status(200).json({
      success: true,
      message: "Lead fetched successfully.",
      data: {
        ...leadResult.rows[0],
        activities: activitiesResult.rows,
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

export const updateLead = async (req, res) => {
  const { id } = req.params;
  const {
    customer_id,
    assigned_to,
    lead_name,
    phone,
    email,
    source,
    destination,
    expected_budget,
    travel_date,
    status,
    priority,
    next_follow_up,
    lost_reason,
  } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
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

    if (source && !SOURCE_TYPES.includes(source)) {
      return res.status(400).json({
        success: false,
        message: `Invalid source. Allowed: ${SOURCE_TYPES.join(", ")}`,
      });
    }

    if (status && !STATUS_TYPES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${STATUS_TYPES.join(", ")}`,
      });
    }

    if (priority && !PRIORITY_TYPES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Allowed: ${PRIORITY_TYPES.join(", ")}`,
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
      `UPDATE leads
       SET customer_id = COALESCE($1, customer_id),
           assigned_to = COALESCE($2, assigned_to),
           lead_name = COALESCE($3, lead_name),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           source = COALESCE($6, source),
           destination = COALESCE($7, destination),
           expected_budget = COALESCE($8, expected_budget),
           travel_date = COALESCE($9, travel_date),
           status = COALESCE($10, status),
           priority = COALESCE($11, priority),
           next_follow_up = COALESCE($12, next_follow_up),
           lost_reason = COALESCE($13, lost_reason),
           updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        customer_id ?? null,
        assigned_to ?? null,
        lead_name ?? null,
        phone ?? null,
        email ?? null,
        source ?? null,
        destination ?? null,
        expected_budget ?? null,
        travel_date ?? null,
        status ?? null,
        priority ?? null,
        next_follow_up ?? null,
        lost_reason ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully.",
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

export const deleteLead = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM leads WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const addLeadActivity = async (req, res) => {
  const { id } = req.params;
  const { organization_id, user_id, activity_type, subject, description, activity_date, next_follow_up } =
    req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID.",
      });
    }

    if (!organization_id || !activity_type) {
      return res.status(400).json({
        success: false,
        message: "organization_id and activity_type are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (!ACTIVITY_TYPES.includes(activity_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid activity_type. Allowed: ${ACTIVITY_TYPES.join(", ")}`,
      });
    }

    if (user_id && !UUID_REGEX.test(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const result = await pool.query(
      `INSERT INTO lead_activities
       (organization_id, lead_id, user_id, activity_type, subject, description, activity_date, next_follow_up)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        organization_id,
        id,
        user_id || null,
        activity_type,
        subject || null,
        description || null,
        activity_date || new Date().toISOString(),
        next_follow_up || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Lead activity recorded successfully.",
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
