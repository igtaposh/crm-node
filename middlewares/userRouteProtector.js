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

    if (!decoded) {
      return res.status(401).json({
        message: "Unauthorized access for this action",
        success: false,
      });
    }

    if (!decoded.user) {
      return res.status(401).json({
        message: "You are unauthorized to perform this action",
        success: false,
      });
    }
    if (
      decoded.organization.status != "inactive" ||
      decoded.organization.status != "suspended"
    ) {
      return res.status(403).json({
        message: "Organization is inactive or suspended",
        success: false,
      });
    }
    const user = decoded.user;
    if (user.status != "inactive" || user.status != "suspended") {
      return res.status(403).json({
        message: "Account is inactive or suspended",
        success: false,
      });
    }
    if (!decoded.isEmailVerified) {
      return res
        .status(403)
        .json({ message: "Account not verified", success: false });
    }
    if (!decoded.role) {
      return res.status(403).json({
        message: "User has invalid role assigned",
        success: false,
      });
    }
    if (!decoded.permissions) {
      return res.status(403).json({
        message: "User has invalid role assigned",
        success: false,
      });
    }

    req.user = decoded.user;
    req.permissions = decoded.permissions;
    req.role = decoded.role;

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
