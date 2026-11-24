import { pool } from "../config/db.js";
import { read_session, session_version } from "../utils/session.js";

export const adminRouteProtector = async (req, res, next) => {
  const session = read_session(req, "admin");

  if (session) {
    const { rows } = await pool.query(
      "SELECT id, email, user_name, password_hash FROM super_admins WHERE id = $1",
      [session.sub],
    );
    const admin = rows[0];
    if (admin && session.version === session_version(admin.password_hash, admin.email)) {
      req.admin = { id: admin.id, email: admin.email, user_name: admin.user_name };
      return next();
    }
  }

  return res.status(401).json({ message: "Unauthorized access", success: false });
};
