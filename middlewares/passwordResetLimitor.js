const password_attempts = new Map();
const window_ms = 15 * 60 * 1000;
const max_attempts = 5;

export const limit_password_attempts = (req, res, next) => {
  const now = Date.now();
  const admin_id = req.admin;

  for (const [id, attempt] of password_attempts) {
    if (attempt.reset_at <= now) {
      password_attempts.delete(id);
    }
  }

  const attempt = password_attempts.get(admin_id) || {
    count: 0,
    reset_at: now + window_ms,
  };

  if (attempt.count >= max_attempts) {
    res.set("Retry-After", String(Math.ceil((attempt.reset_at - now) / 1000)));
    return res.status(429).json({
      success: false,
      message: "Too many password change attempts. Please try again later.",
    });
  }

  attempt.count += 1;
  password_attempts.set(admin_id, attempt);
  return next();
};
