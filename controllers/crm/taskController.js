import { pool, send_database_error } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIORITY_TYPES = ["low", "medium", "high", "urgent"];
const TASK_STATUS_TYPES = ["pending", "in-progress"];

export const createTask = async (req, res) => {
  const {
    assigned_to,
    title,
    description,
    due_date,
    priority,
    status,
  } = req.body || {};
  const { organization_id } = req.user;

  const creatorId = req.user.id;

  try {
    if (!title || !creatorId) {
      return res.status(400).json({
        success: false,
        message: "title, and created_by are required.",
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
    return send_database_error(res, error);
  }
};

export const getAllTasks = async (req, res) => {
  const { status, assigned_to } = req.query;
  const { organization_id } = req.user;
  try {
    let query = `SELECT * FROM tasks WHERE 1=1`;
    const params = [];

    params.push(organization_id);
    query += ` AND organization_id = $1`;

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
    return send_database_error(res, error);
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

    const result = await pool.query(`SELECT * FROM tasks WHERE id = $1 AND organization_id = $2`, [id, req.user.organization_id]);

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
    return send_database_error(res, error);
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
       WHERE id = $7 AND organization_id = $8
       RETURNING *`, [
        assigned_to ?? null,
        title ?? null,
        description ?? null,
        due_date ?? null,
        priority ?? null,
        status ?? null,
        id,
        req.user.organization_id,
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
    return send_database_error(res, error);
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
      `DELETE FROM tasks WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [id, req.user.organization_id],
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
    return send_database_error(res, error);
  }
};
