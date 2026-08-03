import crypto from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encryptionKey(): Buffer {
  const source = process.env.MFA_ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!source) throw new Error("MFA_ENCRYPTION_KEY or JWT_SECRET is required.");
  return crypto.createHash("sha256").update(source).digest();
}

function base32Encode(buffer: Buffer): string {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    output += ALPHABET[Number.parseInt(chunk, 2)];
  }
  return output;
}

function base32Decode(value: string): Buffer {
  let bits = "";
  for (const character of value.replace(/=+$/g, "").toUpperCase()) {
    const index = ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Invalid base32 secret.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

export function generateMfaSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function encryptMfaSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptMfaSecret(payload: string): string {
  const [ivValue, tagValue, encryptedValue] = payload.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Invalid encrypted MFA secret.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

function hotp(secret: string, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", base32Decode(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
  return code;
}

export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(now / 30_000);
  return [-1, 0, 1].some((offset) => crypto.timingSafeEqual(Buffer.from(hotp(secret, counter + offset)), Buffer.from(code)));
}

export function buildOtpAuthUri(email: string, secret: string): string {
  const issuer = "MyFitIdeas";
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${email}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function generateRecoveryCodes(count = 10): { plain: string[]; hashes: string[] } {
  const plain = Array.from({ length: count }, () => crypto.randomBytes(5).toString("hex").toUpperCase());
  const hashes = plain.map((code) => crypto.createHash("sha256").update(code).digest("hex"));
  return { plain, hashes };
}
