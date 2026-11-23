import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

export const adminRouteProtector = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = req.cookies?.token || bearerToken;

  if (!token) {
    return res
      .status(401)
      .json({ message: "no token provided", success: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded) {
      return res.status(401).json({
        message: "Unauthorized access for this action",
        success: false,
      });
    }

    const admin_data = await pool.query(
      `SELECT * FROM super_admins WHERE id = $1`,
      [decoded.id],
    );
    if (admin_data.rowCount === 0) {
      return res.status(401).json({
        message: "You are unauthorized to perform this action",
        success: false,
      });
    }
    req.admin = decoded;

    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized access", success: false });
    return next(error);
  }
};
