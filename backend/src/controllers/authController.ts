import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../types/errors';
import { loginSchema, registerSchema } from '../validators/schemas';
import { loginUser, registerUser, listUserOrganizations } from '../services/authService';
import { AuthRequest } from '../middleware/auth';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = registerSchema.parse(req);
    const result = await registerUser(parsed.body.email, parsed.body.password, parsed.body.name);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.parse(req);
    const result = await loginUser(parsed.body.email, parsed.body.password);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listOrganizations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'unauthorized', 'Authentication required');
    }
    const result = await listUserOrganizations(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
