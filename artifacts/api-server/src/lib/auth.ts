import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.SESSION_SECRET || "smart-retail-erp-secret";
const SALT_ROUNDS = 10;

export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
  type?: "staff";
}

export interface CustomerJwtPayload {
  customerId: number;
  email: string;
  type: "customer";
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, type: "staff" }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const raw = jwt.verify(token, JWT_SECRET) as unknown as Record<string, unknown>;
    if (raw["type"] === "customer") return null;
    return raw as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export function signCustomerToken(payload: CustomerJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyCustomerToken(token: string): CustomerJwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as CustomerJwtPayload;
    if (decoded.type !== "customer") return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
