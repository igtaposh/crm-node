import { pool } from "../../config/db.js";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { sent_otp_for_email_verify } from "../../utils/sent_otp_for_email_verify.js";

export const createUser = async (req, res) => {
  const {
    organization_id,
    branch_id,
    name,
    email,
    phone,
    password_hash,
    employee_code,
    designation,
    status,
  } = req.body;

  const statusValue = status ?? "active";

  try {
    if (!organization_id || !name || !email || !password_hash) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        organization_id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }
    if (branch_id) {
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          branch_id,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID.",
        });
      }
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid email.",
      });
    }

    if (phone) {
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Please enter valid phone.",
        });
      }
    }
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password_hash)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters, one uppercase letter, one number and one special character.",
      });
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
      `SELECT id FROM users WHERE email = $1 AND organization_id = $2`,
      [email, organization_id],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Email ID is already in use in your company, Please use an different Email.",
      });
    }

    const hashed_password = await bcrypt.hash(
      password_hash,
      parseInt(process.env.SALT_ROUNDS),
    );

    const result = await pool.query(
      `INSERT INTO users
        (organization_id, branch_id, name, email, phone, password_hash, employee_code, designation, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
      [
        organization_id,
        branch_id,
        name,
        email,
        phone,
        hashed_password,
        employee_code,
        designation,
        statusValue,
      ],
    );
    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Unble to create any users.",
      });
    }
    await pool.query(
      `INSERT INTO check_user_email
        (user_id, is_varified)
        VALUES ($1, $2)
        RETURNING *`,
      [result.rows[0].id, false],
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully. Please Verify user email.",
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

export const sent_email_verification_otp = async (req, res) => {
  const { user_id } = req.body;
  try {
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        user_id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }
    const user_otp = await pool.query(
      `SELECT * FROM user_otp WHERE user_id = $1`,
      [user_id],
    );

    if (user_otp.rows.length > 0) {
      await pool.query(
        `DELETE FROM user_otp
       WHERE user_id = $1
       RETURNING *`,
        [user_id],
      );
    }

    const otp = randomInt(100000, 1000000).toString();
    const user = await pool.query(`SELECT * FROM users WHERE id = $1`, [
      user_id,
    ]);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found.",
      });
    }
    const organization = await pool.query(
      `SELECT * FROM organizations WHERE id = $1`,
      [user.rows[0].organization_id],
    );
    if (!organization) {
      return res.status(400).json({
        success: false,
        message: "Organization not found.",
      });
    }

    const result = await pool.query(
      `INSERT INTO user_otp
        (user_id, otp, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
        RETURNING *`,
      [user_id, otp],
    );

    await sent_otp_for_email_verify(user.rows[0], otp, organization.rows[0]);

    return res.status(201).json({
      success: true,
      message: "An 6 digit OTP has been sent to your email.",
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
