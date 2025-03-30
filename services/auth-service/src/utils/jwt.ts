import jwt from 'jsonwebtoken';
import { config } from '../config';

export const generateToken = (userId: number): string => {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '24h' });
};

export const verifyToken = (token: string): { userId: number } | null => {
  try {
    return jwt.verify(token, config.jwtSecret) as { userId: number };
  } catch (error) {
    return null;
  }
};

export const decodeToken = (token: string): { userId: number } | null => {
  try {
    return jwt.decode(token) as { userId: number };
  } catch (error) {
    return null;
  }
}; 