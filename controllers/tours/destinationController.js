import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DESTINATION_STATUSES = ["active", "inactive"];

export const createDestination = async (req, res) => {
  const {
    organization_id,
    name,
    slug,
    state,
    country,
    description,
    latitude,
    longitude,
    status,
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

    const statusValue = status ?? "active";
    if (!DESTINATION_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${DESTINATION_STATUSES.join(", ")}`,
      });
    }

    const destinationSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

    const result = await pool.query(
      `INSERT INTO destinations 
       (organization_id, name, slug, state, country, description, latitude, longitude, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        organization_id,
        name,
        destinationSlug,
        state || null,
        country || "india",
        description || null,
        latitude || null,
        longitude || null,
        statusValue,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Destination created successfully.",
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

export const getAllDestinations = async (req, res) => {
  const { organization_id, status } = req.query;
  try {
    let query = `SELECT * FROM destinations WHERE 1=1`;
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

    query += ` ORDER BY name ASC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Destinations fetched successfully.",
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

export const getDestinationById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid destination ID.",
      });
    }

    const result = await pool.query(
      `SELECT * FROM destinations WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Destination not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Destination fetched successfully.",
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

export const updateDestination = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    slug,
    state,
    country,
    description,
    latitude,
    longitude,
    status,
  } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid destination ID.",
      });
    }

    if (status && !DESTINATION_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${DESTINATION_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `UPDATE destinations
       SET name = COALESCE($1, name),
           slug = COALESCE($2, slug),
           state = COALESCE($3, state),
           country = COALESCE($4, country),
           description = COALESCE($5, description),
           latitude = COALESCE($6, latitude),
           longitude = COALESCE($7, longitude),
           status = COALESCE($8, status)
       WHERE id = $9
       RETURNING *`,
      [
        name ?? null,
        slug ?? null,
        state ?? null,
        country ?? null,
        description ?? null,
        latitude ?? null,
        longitude ?? null,
        status ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Destination not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Destination updated successfully.",
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

export const deleteDestination = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid destination ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM destinations WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Destination not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Destination deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};
