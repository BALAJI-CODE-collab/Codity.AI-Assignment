import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../types/errors';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; name: string };
}

export function authenticateToken(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return next(new AppError(401, 'unauthorized', 'Missing token'));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new AppError(500, 'server_error', 'JWT secret not configured'));
  }

  try {
    const payload = jwt.verify(token, secret) as { sub: string; email: string; name: string };
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch {
    next(new AppError(401, 'unauthorized', 'Invalid token'));
  }
}
