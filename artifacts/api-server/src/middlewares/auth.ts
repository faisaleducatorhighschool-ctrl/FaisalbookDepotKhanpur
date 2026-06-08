import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload, verifyCustomerToken, CustomerJwtPayload } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      customer?: CustomerJwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.user = payload;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }
  next();
}

export function requireCustomerAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyCustomerToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired customer token" });
    return;
  }
  req.customer = payload;
  next();
}

export function optionalCustomerAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyCustomerToken(token);
    if (payload) req.customer = payload;
  }
  next();
}
