import crypto from "node:crypto";

const get_encryption_key = () => {
  const secret_key = process.env.ENCRYPTION_SECRET_KEY;

  if (
    typeof secret_key !== "string" ||
    secret_key.length !== 64 ||
    /[^0-9a-f]/i.test(secret_key)
  ) {
    throw new Error(
      "ENCRYPTION_SECRET_KEY must be a 64-character hexadecimal key.",
    );
  }

  return Buffer.from(process.env.ENCRYPTION_SECRET_KEY, "hex");
};

export const encrypt_data = (data) => {
  if (typeof data !== "string") {
    throw new TypeError("Data to encrypt must be a string.");
  }

  const key = get_encryption_key();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: 16,
  });

  const encrypted_data = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ]);
  const auth_tag = cipher.getAuthTag();

  return [iv, auth_tag, encrypted_data]
    .map((part) => part.toString("hex"))
    .join(":");
};

export const decrypt_data = (encrypted_data) => {
  if (typeof encrypted_data !== "string") {
    throw new Error("Invalid encrypted data.");
  }

  const parts = encrypted_data.split(":");

  if (
    parts.length !== 3 ||
    parts[0].length !== 24 ||
    parts[1].length !== 32 ||
    parts[2].length % 2 !== 0 ||
    parts.some((part) => /[^0-9a-f]/i.test(part))
  ) {
    throw new Error("Invalid encrypted data.");
  }

  const key = get_encryption_key();

  try {
    const [iv, auth_tag, ciphertext] = parts.map((part) =>
      Buffer.from(part, "hex"),
    );
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, {
      authTagLength: 16,
    });

    decipher.setAuthTag(auth_tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Invalid encrypted data.");
  }
};
