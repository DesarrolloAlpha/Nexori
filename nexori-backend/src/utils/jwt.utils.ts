import * as jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';

export const generateToken = (userId: string, email: string, role: UserRole): string => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET as jwt.Secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as jwt.SignOptions
  );
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET as jwt.Secret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET as jwt.Secret) as JwtPayload;
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as jwt.Secret) as { userId: string };
};