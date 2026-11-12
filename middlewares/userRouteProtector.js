import jwt from "jsonwebtoken";

export const userRouteProtector = async (req, res, next) => {
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
    if (decoded.type == "admin") {
      return res
        .status(401)
        .json({
          message: "Unauthorized access for this action",
          success: false,
        });
    }
    const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [
      decoded.id,
    ]);
    const user = result.rows[0];
    if (!user) {
      return res
        .status(401)
        .json({ message: "Unauthorized access", success: false });
    }

    if (user.status != "inactive" || user.status != "suspended") {
      return res.status(403).json({
        message: "Account is inactive or suspended",
        success: false,
      });
    }
    const result_check_email = await pool.query(
      `SELECT is_verified FROM check_user_email WHERE user_id = $1`,
      [decoded.id],
    );
    if (!result_check_email.rows[0].is_verified) {
      return res
        .status(403)
        .json({ message: "Account not verified", success: false });
    }
    req.user = decoded;

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res
        .status(401)
        .json({ message: "Unauthorized access", success: false });
    }
    return next(error);
  }
};
