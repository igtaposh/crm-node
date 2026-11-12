import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PACKAGE_STATUSES = ["active", "inactive", "draft", "archived"];

export const createTourPackage = async (req, res) => {
  const {
    organization_id,
    package_code,
    name,
    slug,
    duration_days,
    duration_nights,
    base_price,
    currency,
    description,
    inclusions,
    exclusions,
    cancellation_policy_id,
    status,
    destinations,
    itinerary,
  } = req.body;

  try {
    if (
      !organization_id ||
      !name ||
      duration_days === undefined ||
      duration_nights === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "organization_id, name, duration_days, and duration_nights are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (cancellation_policy_id && !UUID_REGEX.test(cancellation_policy_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cancellation_policy_id.",
      });
    }

    if (duration_days < 0 || duration_nights < 0) {
      return res.status(400).json({
        success: false,
        message: "duration_days and duration_nights must be non-negative.",
      });
    }

    if (base_price !== undefined && base_price < 0) {
      return res.status(400).json({
        success: false,
        message: "base_price must be non-negative.",
      });
    }

    const statusValue = status ?? "active";
    if (!PACKAGE_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${PACKAGE_STATUSES.join(", ")}`,
      });
    }

    const packageSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const packageResult = await client.query(
        `INSERT INTO tour_packages 
         (organization_id, package_code, name, slug, duration_days, duration_nights, base_price, currency, description, inclusions, exclusions, cancellation_policy_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          organization_id,
          package_code || null,
          name,
          packageSlug,
          duration_days,
          duration_nights,
          base_price || 0,
          currency ? currency.toLowerCase() : "inr",
          description || null,
          JSON.stringify(inclusions || []),
          JSON.stringify(exclusions || []),
          cancellation_policy_id || null,
          statusValue,
        ],
      );

      const pkg = packageResult.rows[0];

      if (Array.isArray(destinations)) {
        for (let i = 0; i < destinations.length; i++) {
          const destId = typeof destinations[i] === "object" ? destinations[i].destination_id : destinations[i];
          const seq = typeof destinations[i] === "object" && destinations[i].sequence !== undefined ? destinations[i].sequence : i + 1;
          if (destId && UUID_REGEX.test(destId)) {
            await client.query(
              `INSERT INTO package_destinatons (package_id, destination_id, sequence) VALUES ($1, $2, $3)`,
              [pkg.id, destId, seq],
            );
          }
        }
      }

      if (Array.isArray(itinerary)) {
        for (const item of itinerary) {
          if (item.day_number !== undefined) {
            await client.query(
              `INSERT INTO package_itinerary_days (package_id, day_number, title, description, starting_point, ending_point, distance_km, travel_duration, accommodation_notes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                pkg.id,
                item.day_number,
                item.title || null,
                item.description || null,
                item.starting_point || null,
                item.ending_point || null,
                item.distance_km || null,
                item.travel_duration || null,
                item.accommodation_notes || null,
              ],
            );
          }
        }
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Tour package created successfully.",
        data: pkg,
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

export const getAllTourPackages = async (req, res) => {
  const { organization_id, status } = req.query;
  try {
    let query = `SELECT * FROM tour_packages WHERE 1=1`;
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
      message: "Tour packages fetched successfully.",
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

export const getTourPackageById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid package ID.",
      });
    }

    const pkgResult = await pool.query(
      `SELECT * FROM tour_packages WHERE id = $1`,
      [id],
    );

    if (pkgResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tour package not found.",
      });
    }

    const destResult = await pool.query(
      `SELECT pd.sequence, d.*
       FROM package_destinatons pd
       JOIN destinations d ON pd.destination_id = d.id
       WHERE pd.package_id = $1
       ORDER BY pd.sequence ASC`,
      [id],
    );

    const itineraryResult = await pool.query(
      `SELECT * FROM package_itinerary_days WHERE package_id = $1 ORDER BY day_number ASC`,
      [id],
    );

    return res.status(200).json({
      success: true,
      message: "Tour package fetched successfully.",
      data: {
        ...pkgResult.rows[0],
        destinations: destResult.rows,
        itinerary: itineraryResult.rows,
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

export const updateTourPackage = async (req, res) => {
  const { id } = req.params;
  const {
    package_code,
    name,
    slug,
    duration_days,
    duration_nights,
    base_price,
    currency,
    description,
    inclusions,
    exclusions,
    cancellation_policy_id,
    status,
  } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid package ID.",
      });
    }

    if (cancellation_policy_id && !UUID_REGEX.test(cancellation_policy_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cancellation_policy_id.",
      });
    }

    if (status && !PACKAGE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${PACKAGE_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `UPDATE tour_packages
       SET package_code = COALESCE($1, package_code),
           name = COALESCE($2, name),
           slug = COALESCE($3, slug),
           duration_days = COALESCE($4, duration_days),
           duration_nights = COALESCE($5, duration_nights),
           base_price = COALESCE($6, base_price),
           currency = COALESCE($7, currency),
           description = COALESCE($8, description),
           inclusions = COALESCE($9, inclusions),
           exclusions = COALESCE($10, exclusions),
           cancellation_policy_id = COALESCE($11, cancellation_policy_id),
           status = COALESCE($12, status),
           updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        package_code ?? null,
        name ?? null,
        slug ?? null,
        duration_days ?? null,
        duration_nights ?? null,
        base_price ?? null,
        currency ? currency.toLowerCase() : null,
        description ?? null,
        inclusions ? JSON.stringify(inclusions) : null,
        exclusions ? JSON.stringify(exclusions) : null,
        cancellation_policy_id ?? null,
        status ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tour package not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tour package updated successfully.",
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

export const deleteTourPackage = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid package ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM tour_packages WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tour package not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tour package deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};
