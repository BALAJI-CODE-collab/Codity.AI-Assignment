import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../types/errors';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; name: string };
}

export function authenticateToken(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'unauthorized', 'Missing token'));
  }
  let token = authHeader.substring(7).trim();
  if (token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  } else if (token.startsWith("'") && token.endsWith("'")) {
    token = token.slice(1, -1);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new AppError(500, 'server_error', 'JWT secret not configured'));
  }

  try {
    const payload = jwt.verify(token, secret) as { sub: string; email: string; name: string };
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
    next(new AppError(401, 'unauthorized', 'Invalid token'));
  }
}
