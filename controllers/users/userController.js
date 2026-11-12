import { pool } from "../../config/db.js";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { sent_otp_for_email_verify } from "../../utils/sent_otp_for_email_verify.js";
import jwt from "jsonwebtoken";

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

  const statusValue = status ?? "inactive";

  try {
    if (!organization_id || !name || !email || !password_hash || !role_id) {
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
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        role_id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID.",
      });
    }

    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND organization_id = $2`,
      [email, organization_id],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email ID is already in use, Please use an different Email.",
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

    await pool.query(
      `INSERT INTO check_user_email
        (user_id, is_verified)
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
export const createAdminUser = async (req, res) => {
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
    if (!organization_id || !name || !email || !password_hash || !role_id) {
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

    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND organization_id = $2`,
      [email, organization_id],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email ID is already in use, Please use an different Email.",
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

    await pool.query(
      `INSERT INTO check_user_email
        (user_id, is_verified)
        VALUES ($1, $2)
        RETURNING *`,
      [result.rows[0].id, true],
    );
    const roleResult = await pool.query(
      `INSERT INTO roles
        (organization_id, name)
        VALUES ($1, $2)
        RETURNING *`,
      [organization_id, "admin"],
    );
    await pool.query(
      `INSERT INTO user_role
        (user_id, role_id)
        VALUES ($1, $2)
        RETURNING *`,
      [result.rows[0].id, roleResult.rows[0].id],
    );
    const modules = ["crm", "finance", "bookings", "etc"];

    const actions = ["create", "read", "update", "delete", "approve", "post"];

    const values = [];
    const placeholders = [];

    let index = 1;

    for (const module of modules) {
      for (const action of actions) {
        placeholders.push(`($${index++}, $${index++}, $${index++})`);

        values.push(module, action, `${action} permission for ${module}`);
      }
    }

    const permissionResult = await pool.query(
      `INSERT INTO permissions (module, action, description)
   VALUES ${placeholders.join(", ")}
   ON CONFLICT (module, action) DO NOTHING
   RETURNING *`,
      values,
    );
    await pool.query(
      `INSERT INTO role_permissions
        (role_id, permissions_id)
        VALUES ($1, $2)
        RETURNING *`,
      [roleResult.rows[0].id, permissionResult.rows[0].id],
    );

    return res.status(201).json({
      success: true,
      message: "Admin created successfully.",
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
    if (user.rows.length === 0) {
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

export const verify_user_email = async (req, res) => {
  const { user_id, otp } = req.body;
  try {
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
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
    if (!/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        message: "Invalid 6 digit OTP.",
      });
    }
    const check_user_email = await pool.query(
      `SELECT is_verified FROM check_user_email WHERE user_id = $1`,
      [user_id],
    );
    if (check_user_email.rows.is_verfied) {
      return res.status(400).json({
        success: false,
        message: "User email is already verified.",
      });
    }
    const user = await pool.query(`SELECT id FROM users WHERE id = $1`, [
      user_id,
    ]);
    if (user.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User not found.",
      });
    }
    const user_otp = await pool.query(
      `SELECT otp FROM user_otp WHERE user_id = $1 AND expires_at > NOW() FOR UPDATE;`,
      [user_id],
    );
    if (user_otp.rows.length === 0 || user_otp.rows[0].otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or Expired OTP.",
      });
    }
    await pool.query(`DELETE FROM user_otp WHERE user_id = $1`, [user_id]);

    const updated_verification = await pool.query(
      `UPDATE check_user_email SET is_verified = TRUE WHERE user_id = $1`,
      [user_id],
    );
    if (updated_verification.rowCount !== 1) {
      return res.status(400).json({
        success: false,
        message: "Email verification failed.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "OTP has been verified successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error,
    });
  }
};

export const user_login = async (req, res) => {
  const { email, password_hash } = req.body;
  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "invaild Email ID.",
      });
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid email.",
      });
    }
    if (!password_hash) {
      return res.status(400).json({
        success: false,
        message: "Invaild password.",
      });
    }

    const existing_user = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email],
    );
    if (existing_user.rowCount != 1) {
      return res.status(400).json({
        success: false,
        message: "Invaild user credintials.",
      });
    }
    const user_password = existing_user.rows[0].password_hash;
    const is_correct_password = await bcrypt.compare(
      password_hash,
      user_password,
    );

    if (!is_correct_password) {
      return res.status(400).json({
        success: false,
        message: "Invaild Email or Password.",
      });
    }

    const check_user_email = await pool.query(
      `SELECT is_verified FROM check_user_email WHERE user_id = $1`,
      [existing_user.rows[0].id],
    );

    if (check_user_email.rows[0].is_verified != true) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email first.",
      });
    }
    // const user_roles = await pool.query(
    //   `SELECT role_id FROM user_roles WHERE user_id = $1`,
    //   [existing_user.rows[0].id],
    // );
    // if (user_roles.rowCount < 1) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "User role has invalid role type.",
    //   });
    // }
    // const roles = await pool.query(`SELECT name FROM roles WHERE id = $1`, [
    //   user_roles.rows[0].role_id,
    // ]);
    // if (roles.rowCount !== 1) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Invalid role.",
    //   });
    // }
    const token = jwt.sign(
      {
        id: existing_user.rows[0].id,
        name: existing_user.rows[0].name,
        email: existing_user.rows[0].email,
        // role: roles.rows[0].name,
        status: existing_user.rows[0].status,
        isEmailVerified: check_user_email.rows[0].is_verfied,
        type: "user",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    return res.status(200).json({
      success: true,
      message: "User authenticated successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error,
    });
  }
};
