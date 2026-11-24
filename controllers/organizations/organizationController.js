import { pool } from "../../config/db.js";
import { generateUniqueSlug } from "../../utils/generate_unique_slug.js";

export const create_organization = async (req, res) => {
  const {
    name,
    legal_name,
    email,
    phone,
    website,
    gstin,
    pan,
    currency,
    timezone,
  } = req.body || {};

  const currencyValue = currency ?? "INR";
  const timezoneValue = timezone ?? "Asia/Kolkata";

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name and slug is required to fill.",
      });
    }

    if (email) {
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please enter valid email.",
        });
      }
    }
    if (phone) {
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Please enter valid phone.",
        });
      }
    }
    if (website) {
      if (
        !/^(https?:\/\/)?([\w-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/.test(
          website,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Please enter valid URL.",
        });
      }
    }
    if (gstin) {
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) {
        return res.status(400).json({
          success: false,
          message: "Please enter valid GST number.",
        });
      }
    }
    if (pan) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
        return res.status(400).json({
          success: false,
          message: "Please enter valid pan number.",
        });
      }
    }

    const slug = await generateUniqueSlug(name);

    const result = await pool.query(
      `INSERT INTO organizations
        (name, legal_name, slug, email, phone, website, gstin, pan, currency, timezone)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
      [
        name,
        legal_name || null,
        slug,
        email || null,
        phone || null,
        website || null,
        gstin || null,
        pan || null,
        currencyValue,
        timezoneValue,
      ],
    );
    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Unble to create any organizations.",
      });
    }
    return res.status(201).json({
      success: true,
      message: "Organization created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const get_all_organizations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM organizations
      `);
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No organization found.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "ALL organizations fethed successfully.",
      data: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const accept_organization_update = async (req, res) => {
  const request_id = req.params.id || req.body?.request_id;

  try {
    if (
      !request_id ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        request_id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID.",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const requestResult = await client.query(
        `SELECT * FROM organization_update_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`,
        [request_id],
      );

      if (requestResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          message: "Pending update request not found.",
        });
      }

      const { organization_id, requested_data } = requestResult.rows[0];

      const {
        legal_name,
        name,
        email,
        slug,
        phone,
        website,
        gstin,
        pan,
        currency,
        timezone,
      } = requested_data;

      const updateResult = await client.query(
        `UPDATE organizations SET
          legal_name = COALESCE($1, legal_name),
          name = COALESCE($2, name),
          slug = COALESCE($3, slug),
          email = COALESCE($4, email),
          phone = COALESCE($5, phone),
          website = COALESCE($6, website),
          gstin = COALESCE($7, gstin),
          pan = COALESCE($8, pan),
          currency = COALESCE($9, currency),
          timezone = COALESCE($10, timezone),
          updated_at = NOW()
         WHERE id = $11 RETURNING *`,
        [
          legal_name ?? null,
          name ?? null,
          slug ?? null,
          email ?? null,
          phone ?? null,
          website ?? null,
          gstin ?? null,
          pan ?? null,
          currency ?? null,
          timezone ?? null,
          organization_id,
        ],
      );

      await client.query(
        `UPDATE organization_update_requests
         SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
        [request_id],
      );

      await client.query("COMMIT");
      return res.status(200).json({
        success: true,
        message: "Organization details updated successfully.",
        data: updateResult.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const update_organization_status = async (req, res) => {
  const organization_id = req.params.id;
  const { status } = req.body || {};
  try {
    if (
      !organization_id ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        organization_id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }
    if (!["active", "inactive", "suspended"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value.",
      });
    }

    const result = await pool.query(
      `UPDATE organizations SET status = $1 WHERE id = $2 AND status != $3 RETURNING status`,
      [status, organization_id, status],
    );
    if (result.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Status updatation failed please try again later.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Organization status updated successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// for users

export const get_organizatins_by_id = async (req, res) => {
  const id = req.user.organization_id;
  try {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }
    const result = await pool.query(
      `
      SELECT * FROM organizations WHERE id = $1 
      `,
      [id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No organization found with this ID.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "organization data fethed successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const request_organization_update = async (req, res) => {
  const { organization_id } = req.user;

  const {
    legal_name,
    name,
    email,
    phone,
    website,
    gstin,
    pan,
    currency,
    timezone,
  } = req.body || {};

  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update branch status.",
      });
    }
    const requestedData = {};

    if (
      !legal_name &&
      !name &&
      !email &&
      !phone &&
      !website &&
      !gstin &&
      !pan &&
      !currency &&
      !timezone
    ) {
      return res.status(400).json({
        success: false,
        message: "Update request fields cannot be empty.",
      });
    }

    if (legal_name != null) {
      if (typeof legal_name !== "string" || !legal_name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Invalid legal name.",
        });
      }

      Object.assign(requestedData, { legal_name: legal_name.trim() });
    }

    if (name != null) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Invalid organization name.",
        });
      }
      const slug = await generateUniqueSlug(name);
      Object.assign(requestedData, { name: name.trim() });
      Object.assign(requestedData, { slug: slug });
    }

    if (email != null) {
      if (
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid email address.",
        });
      }

      Object.assign(requestedData, { email: email.trim().toLowerCase() });
    }

    if (phone != null) {
      if (typeof phone !== "string" || !/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number.",
        });
      }

      Object.assign(requestedData, { phone: phone });
    }

    if (pan != null) {
      if (typeof pan !== "string" || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
        return res.status(400).json({
          success: false,
          message: "Invalid PAN number.",
        });
      }

      Object.assign(requestedData, { pan: pan });
    }

    if (gstin != null) {
      if (
        typeof gstin !== "string" ||
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid GSTIN number.",
        });
      }

      Object.assign(requestedData, { gstin: gstin });
    }

    if (currency != null) {
      if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
        return res.status(400).json({
          success: false,
          message: "Invalid currency code.",
        });
      }

      Object.assign(requestedData, { currency: currency });
    }

    if (website != null) {
      try {
        if (typeof website !== "string") {
          throw new Error("Invalid website.");
        }

        const url = new URL(website);

        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Invalid protocol.");
        }

        Object.assign(requestedData, { website: website.trim() });
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid website URL.",
        });
      }
    }

    if (timezone != null) {
      try {
        if (typeof timezone !== "string" || !timezone.trim()) {
          throw new Error("Invalid timezone.");
        }

        new Intl.DateTimeFormat("en", {
          timeZone: timezone,
        });

        Object.assign(requestedData, { timezone: timezone });
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid timezone.",
        });
      }
    }

    const existing_request = await pool.query(
      `SELECT status FROM organization_update_requests WHERE organization_id = $1 AND status = 'pending'`,
      [organization_id],
    );
    if (existing_request.rowCount !== 0) {
      return res.status(400).json({
        success: false,
        message:
          "A update request already being proccessed please wait till any response.",
      });
    }

    const requestResult = await pool.query(
      `INSERT INTO organization_update_requests ( organization_id, requested_data ) VALUES ($1, $2) RETURNING *`,
      [organization_id, JSON.stringify(requestedData)],
    );

    return res.status(201).json({
      success: true,
      message: "Organization update request submitted successfully.",
      data: requestResult.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
