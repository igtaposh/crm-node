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
    
    req.admin = decoded;

    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized access", success: false });
    return next(error);
  }
};
