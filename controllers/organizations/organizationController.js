import { pool } from "../../config/db.js";

export const createOrganization = async (req, res) => {
  const {
    name,
    legal_name,
    slug,
    email,
    phone,
    website,
    gstin,
    pan,
    currency,
    timezone,
    status,
  } = req.body;

  const currencyValue = currency ?? "INR";
  const timezoneValue = timezone ?? "Asia/Kolkata";
  const statusValue = status ?? "active";

  try {
    if (!name || !slug) {
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

    if (status) {
      if (
        status !== "active" &&
        status !== "suspended" &&
        status !== "inactive"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Status value can not be different than 'active', 'suspended', 'inactive'.",
        });
      }
    }
    const existing = await pool.query(
      `SELECT id FROM organizations WHERE slug = $1`,
      [slug],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Slug is already taken.",
      });
    }
    const result = await pool.query(
      `INSERT INTO organizations
        (name, legal_name, slug, email, phone, website, gstin, pan, currency, timezone, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        statusValue,
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
      error,
    });
  }
};

export const getAllOrganizations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM organizations
      `);
    if (result.length <= 0) {
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
      error,
    });
  }
};

export const getOrganizatinsById = async (req, res) => {
  const { id } = req.params;
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
    if (result.length <= 0) {
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
      error,
    });
  }
};

// export const updateOrganization = async (req, res) => {
//   const { name, legal_name, slug, email, phone, website } = req.body;

//   try {
//     if (email) {
//       if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
//         return res.status(400).json({
//           success: false,
//           message: "Please enter valid email.",
//         });
//       }
//     }
//     if (phone) {
//       if (!/^[6-9]\d{9}$/.test(phone)) {
//         return res.status(400).json({
//           success: false,
//           message: "Please enter valid phone.",
//         });
//       }
//     }
//     if (website) {
//       if (
//         !/^(https?:\/\/)?([\w-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/.test(
//           website,
//         )
//       ) {
//         return res.status(400).json({
//           success: false,
//           message: "Please enter valid URL.",
//         });
//       }
//     }

//     const existing = await pool.query(
//       `SELECT id FROM organizations WHERE slug = $1`,
//       [slug],
//     );
//     if (existing.rows.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Slug is already taken.",
//       });
//     }
//     const result = await pool.query(
//       `UPDATE organizations SET (name, legal_name, slug, email, phone, website, gstin, pan, currency, timezone, status) WHERE VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *;`,
//       [
//         name,
//         legal_name || null,
//         slug,
//         email || null,
//         phone || null,
//         website || null,
//       ],
//     );

//     if (!result) {
//       return res.status(400).json({
//         success: false,
//         message: "Unble to create any organizations.",
//       });
//     }
//     return res.status(201).json({
//       success: true,
//       message: "Organization created successfully.",
//       data: result.rows[0],
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error.",
//       error,
//     });
//   }
// };
