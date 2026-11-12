import jwt from "jsonwebtoken";

export const adminRouteProtector = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = req.cookies?.token || bearerToken;
  console.log(authorization)

  if (!token) {
    return res
      .status(401)
      .json({ message: "no token provided", success: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type == "user") {
      return res.status(401).json({
        message: "Unauthorized access for this action",
        success: false,
      });
    }
    req.admin_data = decoded;

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
