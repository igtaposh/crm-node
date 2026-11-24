import { createHmac } from "node:crypto";
import jwt from "jsonwebtoken";

export const session_version = (password_hash, email) =>
  createHmac("sha256", process.env.JWT_SECRET)
    .update(JSON.stringify([password_hash, email]))
    .digest("hex");

export const sign_session = (type, account) =>
  jwt.sign(
    { type, version: session_version(account.password_hash, account.email) },
    process.env.JWT_SECRET,
    { algorithm: "HS256", subject: account.id, expiresIn: "1d" },
  );

export const read_session = (req, type) => {
  const bearer_token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer_token || req.cookies?.token;
  if (!token) return null;

  try {
    const session = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (
      session.type !== type ||
      typeof session.sub !== "string" ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(session.sub)
    ) return null;

    return session;
  } catch {
    return null;
  }
};
