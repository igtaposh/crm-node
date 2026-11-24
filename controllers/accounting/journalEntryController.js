import { pool, send_database_error } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PARTY_TYPES = ["customer", "supplier", "employee", "none"];

export const createJournalEntry = async (req, res) => {
  const {
    branch_id,
    journal_number,
    journal_date,
    reference_type,
    reference_id,
    description,
    status,
    lines,
  } = req.body || {};
  const { organization_id } = req.user;

  const posterId = req.user.id;

  try {
    if (
      !journal_number ||
      !journal_date
    ) {
      return res.status(400).json({
        success: false,
        message: "journal_number, and journal_date are required.",
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
    if (!["draft", "posted"].includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed: draft, posted.",
      });
    }

    if (statusValue === "posted" && req.role !== "admin" &&
        !req.permissions.some((permission) => permission.module === "finance" && permission.action === "post")) {
      return res.status(403).json({ success: false, message: "Permission to post journal entries is required." });
    }
    if (!Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ success: false, message: "At least two journal lines are required." });
    }
    for (const line of lines) {
      const debit = line?.debit ?? 0;
      const credit = line?.credit ?? 0;
      const amount_pattern = /^\d+(?:\.\d{1,2})?$/;
      if (!UUID_REGEX.test(line?.account_id) ||
          !PARTY_TYPES.includes(line?.party_type ?? "none") ||
          !amount_pattern.test(String(debit)) || !amount_pattern.test(String(credit)) ||
          (Number(debit) > 0) === (Number(credit) > 0)) {
        return res.status(400).json({ success: false, message: "Each line must have an account and a positive debit or credit." });
      }
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
          const pType = line.party_type ?? "none";

          const lineResult = await client.query(
            `INSERT INTO journal_lines
             (journal_entry_id, account_id, debit, credit, description, party_type, party_id, booking_id)
             SELECT $1, a.id, $3, $4, $5, $6, $7, $8
             FROM charts_of_accounts a
             WHERE a.id = $2 AND a.organization_id = $9 AND a.status = 'active'
               AND ($8::uuid IS NULL OR EXISTS (
                 SELECT 1 FROM bookings WHERE id = $8 AND organization_id = $9
               ))
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
              organization_id,
            ],
          );
          if (!lineResult.rowCount) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "A journal line account or booking is unavailable." });
          }
          insertedLines.push(lineResult.rows[0]);
        }
      }

      const totals = await client.query(
        "SELECT SUM(debit) = SUM(credit) AS balanced FROM journal_lines WHERE journal_entry_id = $1",
        [entry.id],
      );
      if (!totals.rows[0]?.balanced) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Journal debits and credits must balance." });
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
    return send_database_error(res, error);
  }
};

export const getAllJournalEntries = async (req, res) => {
  const { status } = req.query;
  const { organization_id } = req.user;
  try {
    let query = `SELECT * FROM journal_entries WHERE 1=1`;
    const params = [];

    params.push(organization_id);
    query += ` AND organization_id = $1`;

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
    return send_database_error(res, error);
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
      `SELECT * FROM journal_entries WHERE id = $1 AND organization_id = $2`,
      [id, req.user.organization_id],
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
    return send_database_error(res, error);
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
      `UPDATE journal_entries SET status = 'reversed'
       WHERE id = $1 AND organization_id = $2 AND status = 'posted' RETURNING *`,
      [id, req.user.organization_id],
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
    return send_database_error(res, error);
  }
};
