import { pool, send_database_error } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NOTIFICATION_TYPES = ["info", "success", "error", "warning"];

export const createNotification = async (req, res) => {
  const { user_id, title, message, type } = req.body || {};
  const { organization_id } = req.user;

  try {
    if (!user_id || !title || !message || !type) {
      return res.status(400).json({
        success: false,
        message:
          "user_id, title, message, and type are required.",
      });
    }

    if (!UUID_REGEX.test(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (!NOTIFICATION_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Allowed: ${NOTIFICATION_TYPES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `INSERT INTO notifications (organization_id, user_id, title, message, type, is_read)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [organization_id, user_id, title, message, type],
    );

    return res.status(201).json({
      success: true,
      message: "Notification created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const getAllNotifications = async (req, res) => {
  const { is_read } = req.query;
  const { organization_id } = req.user;
  const currentUserId = req.user.id;

  try {
    let query = `SELECT * FROM notifications WHERE 1=1`;
    const params = [];

    params.push(organization_id);
    query += ` AND organization_id = $1`;

    if (currentUserId) {
      if (!UUID_REGEX.test(currentUserId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID.",
        });
      }
      params.push(currentUserId);
      query += ` AND user_id = $${params.length}`;
    }

    if (is_read !== undefined) {
      params.push(is_read === "true");
      query += ` AND is_read = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully.",
      data: result.rows,
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const result = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND organization_id = $2 AND user_id = $3 RETURNING *`,
      [id, req.user.organization_id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: result.rows[0],
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const deleteNotification = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND organization_id = $2 AND user_id = $3 RETURNING id`,
      [id, req.user.organization_id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    return send_database_error(res, error);
  }
};
