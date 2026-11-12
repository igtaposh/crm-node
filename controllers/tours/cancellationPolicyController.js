import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHARGE_TYPES = ["fixed-amount", "percentage"];

export const createCancellationPolicy = async (req, res) => {
  const { organization_id, name, description, is_active, rules } = req.body;

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

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const policyResult = await client.query(
        `INSERT INTO cancellation_policies (organization_id, name, description, is_active)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          organization_id,
          name,
          description || null,
          is_active !== undefined ? Boolean(is_active) : true,
        ],
      );

      const policy = policyResult.rows[0];
      const insertedRules = [];

      if (Array.isArray(rules) && rules.length > 0) {
        for (const rule of rules) {
          if (
            rule.days_before_depurture === undefined ||
            rule.charge_value === undefined ||
            !rule.charge_type
          ) {
            continue;
          }
          if (!CHARGE_TYPES.includes(rule.charge_type)) {
            continue;
          }

          const ruleRes = await client.query(
            `INSERT INTO cancellation_policy_rules (policy_id, days_before_depurture, charge_type, charge_value)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
              policy.id,
              rule.days_before_depurture,
              rule.charge_type,
              rule.charge_value,
            ],
          );
          insertedRules.push(ruleRes.rows[0]);
        }
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Cancellation policy created successfully.",
        data: {
          ...policy,
          rules: insertedRules,
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

export const getAllCancellationPolicies = async (req, res) => {
  const { organization_id } = req.query;
  try {
    let query = `SELECT * FROM cancellation_policies WHERE 1=1`;
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

    query += ` ORDER BY name ASC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Cancellation policies fetched successfully.",
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

export const getCancellationPolicyById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid policy ID.",
      });
    }

    const policyResult = await pool.query(
      `SELECT * FROM cancellation_policies WHERE id = $1`,
      [id],
    );

    if (policyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cancellation policy not found.",
      });
    }

    const rulesResult = await pool.query(
      `SELECT * FROM cancellation_policy_rules WHERE policy_id = $1 ORDER BY days_before_depurture DESC`,
      [id],
    );

    return res.status(200).json({
      success: true,
      message: "Cancellation policy fetched successfully.",
      data: {
        ...policyResult.rows[0],
        rules: rulesResult.rows,
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

export const updateCancellationPolicy = async (req, res) => {
  const { id } = req.params;
  const { name, description, is_active } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid policy ID.",
      });
    }

    const result = await pool.query(
      `UPDATE cancellation_policies
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_active = COALESCE($3, is_active)
       WHERE id = $4
       RETURNING *`,
      [name ?? null, description ?? null, is_active ?? null, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cancellation policy not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cancellation policy updated successfully.",
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

export const deleteCancellationPolicy = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid policy ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM cancellation_policies WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cancellation policy not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cancellation policy deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const addCancellationRule = async (req, res) => {
  const { id } = req.params;
  const { days_before_depurture, charge_type, charge_value } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid policy ID.",
      });
    }

    if (
      days_before_depurture === undefined ||
      !charge_type ||
      charge_value === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "days_before_depurture, charge_type, and charge_value are required.",
      });
    }

    if (!CHARGE_TYPES.includes(charge_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid charge_type. Allowed: ${CHARGE_TYPES.join(", ")}`,
      });
    }

    if (days_before_depurture < 0 || charge_value < 0) {
      return res.status(400).json({
        success: false,
        message: "days_before_depurture and charge_value must be non-negative.",
      });
    }

    const result = await pool.query(
      `INSERT INTO cancellation_policy_rules (policy_id, days_before_depurture, charge_type, charge_value)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, days_before_depurture, charge_type, charge_value],
    );

    return res.status(201).json({
      success: true,
      message: "Policy rule added successfully.",
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
