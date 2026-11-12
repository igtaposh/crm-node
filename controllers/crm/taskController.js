import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIORITY_TYPES = ["low", "medium", "high", "urgent"];
const TASK_STATUS_TYPES = ["pending", "in-progress"];

export const createTask = async (req, res) => {
  const {
    organization_id,
    assigned_to,
    created_by,
    title,
    description,
    due_date,
    priority,
    status,
  } = req.body;

  const creatorId = created_by || req.user?.id;

  try {
    if (!organization_id || !title || !creatorId) {
      return res.status(400).json({
        success: false,
        message: "organization_id, title, and created_by are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (!UUID_REGEX.test(creatorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid created_by user ID.",
      });
    }

    if (assigned_to && !UUID_REGEX.test(assigned_to)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assigned_to user ID.",
      });
    }

    const priorityValue = priority ?? "medium";
    if (!PRIORITY_TYPES.includes(priorityValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Allowed: ${PRIORITY_TYPES.join(", ")}`,
      });
    }

    const statusValue = status ?? "pending";
    if (!TASK_STATUS_TYPES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${TASK_STATUS_TYPES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `INSERT INTO tasks 
       (organization_id, assigned_to, created_by, title, description, due_date, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        organization_id,
        assigned_to || null,
        creatorId,
        title,
        description || null,
        due_date || null,
        priorityValue,
        statusValue,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Task created successfully.",
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

export const getAllTasks = async (req, res) => {
  const { organization_id, status, assigned_to } = req.query;
  try {
    let query = `SELECT * FROM tasks WHERE 1=1`;
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
      message: "Tasks fetched successfully.",
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

export const getTaskById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID.",
      });
    }

    const result = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task fetched successfully.",
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

export const updateTask = async (req, res) => {
  const { id } = req.params;
  const { assigned_to, title, description, due_date, priority, status } =
    req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID.",
      });
    }

    if (assigned_to && !UUID_REGEX.test(assigned_to)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assigned_to ID.",
      });
    }

    if (priority && !PRIORITY_TYPES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Allowed: ${PRIORITY_TYPES.join(", ")}`,
      });
    }

    if (status && !TASK_STATUS_TYPES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${TASK_STATUS_TYPES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET assigned_to = COALESCE($1, assigned_to),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           due_date = COALESCE($4, due_date),
           priority = COALESCE($5, priority),
           status = COALESCE($6, status)
       WHERE id = $7
       RETURNING *`,
      [
        assigned_to ?? null,
        title ?? null,
        description ?? null,
        due_date ?? null,
        priority ?? null,
        status ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task updated successfully.",
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

export const deleteTask = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM tasks WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};
