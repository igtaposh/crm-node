import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createDocument = async (req, res) => {
  const {
    organization_id,
    entity_type,
    entity_id,
    document_type,
    file_name,
    storage_key,
    mime_type,
    file_size,
    uploaded_by,
  } = req.body;

  const uploaderId = uploaded_by || req.user?.id;

  try {
    if (
      !organization_id ||
      !entity_type ||
      !entity_id ||
      !file_name ||
      !storage_key
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organization_id, entity_type, entity_id, file_name, and storage_key are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (!UUID_REGEX.test(entity_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid entity ID.",
      });
    }

    if (uploaderId && !UUID_REGEX.test(uploaderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid uploaded_by user ID.",
      });
    }

    const result = await pool.query(
      `INSERT INTO documents
       (organization_id, entity_type, entity_id, document_type, file_name, storage_key, mime_type, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        organization_id,
        entity_type,
        entity_id,
        document_type || null,
        file_name,
        storage_key,
        mime_type || null,
        file_size || null,
        uploaderId || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Document record created successfully.",
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

export const getAllDocuments = async (req, res) => {
  const { organization_id, entity_type, entity_id } = req.query;
  try {
    let query = `SELECT * FROM documents WHERE 1=1`;
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

    if (entity_type) {
      params.push(entity_type);
      query += ` AND entity_type = $${params.length}`;
    }

    if (entity_id) {
      if (!UUID_REGEX.test(entity_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid entity ID.",
        });
      }
      params.push(entity_id);
      query += ` AND entity_id = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Documents fetched successfully.",
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

export const getDocumentById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const result = await pool.query(`SELECT * FROM documents WHERE id = $1`, [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Document fetched successfully.",
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

export const deleteDocument = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM documents WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};
