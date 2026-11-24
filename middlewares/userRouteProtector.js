import { pool } from "../config/db.js";
import { read_session, session_version } from "../utils/session.js";

const protect_user = (allow_unverified) => async (req, res, next) => {
  const session = read_session(req, "user");
  if (!session) {
    return res.status(401).json({ success: false, message: "Unauthorized access." });
  }

  const { rows } = await pool.query(
    `SELECT u.id, u.organization_id, u.branch_id, u.email, u.name, u.status,
            u.password_hash, o.status AS organization_status, b.status AS branch_status,
            EXISTS (SELECT 1 FROM check_user_email e
                    WHERE e.user_id = u.id AND e.is_verified) AS is_verified
     FROM users u JOIN organizations o ON o.id = u.organization_id
     LEFT JOIN branches b ON b.id = u.branch_id AND b.organization_id = u.organization_id
     WHERE u.id = $1`,
    [session.sub],
  );
  const user = rows[0];
  if (!user || session.version !== session_version(user.password_hash, user.email)) {
    return res.status(401).json({ success: false, message: "Unauthorized access." });
  }
  if (user.status !== "active" || user.organization_status !== "active" || (user.branch_id && user.branch_status !== "active")) {
    return res.status(403).json({ success: false, message: "Account or organization is inactive." });
  }
  if (!allow_unverified && !user.is_verified) {
    return res.status(403).json({ success: false, message: "Account not verified." });
  }

  const access = await pool.query(
    `SELECT DISTINCT r.name, p.module, p.action
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id AND r.organization_id = $2
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = $1`,
    [user.id, user.organization_id],
  );
  req.user = {
    id: user.id, organization_id: user.organization_id, branch_id: user.branch_id,
    email: user.email, name: user.name, status: user.status,
  };
  req.role = access.rows.some((row) => row.name === "admin") ? "admin" : access.rows[0]?.name;
  req.permissions = access.rows;

  if (!allow_unverified && !req.role) {
    return res.status(403).json({ success: false, message: "User has no assigned role." });
  }
  return next();
};

export const userRouteProtector = protect_user(false);
export const emailVerificationProtector = protect_user(true);

export const require_permission = (module, action) => (req, res, next) => {
  if (
    req.role === "admin" ||
    req.permissions.some((permission) => permission.module === module && permission.action === action)
  ) return next();

  return res.status(403).json({ success: false, message: "Permission denied." });
};
