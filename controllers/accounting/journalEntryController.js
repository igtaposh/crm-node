import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JOURNAL_STATUSES = ["draft", "posted", "reversed"];
const PARTY_TYPES = ["customer", "supplier", "employee", "none"];

export const createJournalEntry = async (req, res) => {
  const {
    organization_id,
    branch_id,
    journal_number,
    journal_date,
    reference_type,
    reference_id,
    description,
    status,
    posted_by,
    lines,
  } = req.body;

  const posterId = posted_by || req.user?.id;

  try {
    if (
      !organization_id ||
      !journal_number ||
      !journal_date
    ) {
      return res.status(400).json({
        success: false,
        message: "organization_id, journal_number, and journal_date are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (branch_id && !UUID_REGEX.test(branch_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    if (posterId && !UUID_REGEX.test(posterId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid posted_by user ID.",
      });
    }

    const statusValue = status ?? "posted";
    if (!JOURNAL_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${JOURNAL_STATUSES.join(", ")}`,
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const entryResult = await client.query(
        `INSERT INTO journal_entries
         (organization_id, branch_id, journal_number, journal_date, reference_type, reference_id, description, status, posted_by, posted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          organization_id,
          branch_id || null,
          journal_number,
          journal_date,
          reference_type || null,
          reference_id || null,
          description || null,
          statusValue,
          posterId || null,
          statusValue === "posted" ? new Date().toISOString() : null,
        ],
      );

      const entry = entryResult.rows[0];
      const insertedLines = [];

      if (Array.isArray(lines) && lines.length > 0) {
        for (const line of lines) {
          if (!line.account_id) continue;
          if (!UUID_REGEX.test(line.account_id)) continue;

          const pType = line.party_type ?? "none";
          if (!PARTY_TYPES.includes(pType)) continue;

          const lineResult = await client.query(
            `INSERT INTO journal_lines
             (journal_entry_id, account_id, debit, credit, description, party_type, party_id, booking_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
              entry.id,
              line.account_id,
              line.debit || 0,
              line.credit || 0,
              line.description || null,
              pType,
              line.party_id || null,
              line.booking_id || null,
            ],
          );
          insertedLines.push(lineResult.rows[0]);
        }
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Journal entry created successfully.",
        data: {
          ...entry,
          lines: insertedLines,
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

export const getAllJournalEntries = async (req, res) => {
  const { organization_id, status } = req.query;
  try {
    let query = `SELECT * FROM journal_entries WHERE 1=1`;
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

    query += ` ORDER BY journal_date DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Journal entries fetched successfully.",
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

export const getJournalEntryById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid journal entry ID.",
      });
    }

    const entryResult = await pool.query(
      `SELECT * FROM journal_entries WHERE id = $1`,
      [id],
    );

    if (entryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found.",
      });
    }

    const linesResult = await pool.query(
      `SELECT * FROM journal_lines WHERE journal_entry_id = $1`,
      [id],
    );

    return res.status(200).json({
      success: true,
      message: "Journal entry fetched successfully.",
      data: {
        ...entryResult.rows[0],
        lines: linesResult.rows,
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

export const reverseJournalEntry = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid journal entry ID.",
      });
    }

    const result = await pool.query(
      `UPDATE journal_entries SET status = 'reversed' WHERE id = $1 RETURNING *`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Journal entry reversed successfully.",
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
