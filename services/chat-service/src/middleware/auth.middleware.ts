import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user: {
        userId: number;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  logger.info('Auth middleware started', {
    url: req.originalUrl,
    method: req.method,
    headers: req.headers
  });

  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    logger.warn('No authorization header provided');
    return res.status(401).json({ error: 'Authorization header is required' });
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    logger.warn('Invalid authorization header format');
    return res.status(401).json({ error: 'Invalid authorization header format' });
  }

  const token = tokenParts[1];
  
  try {
    logger.debug('Verifying JWT token', { token });
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: number };
    
    logger.info('User authenticated successfully', {
      userId: decoded.userId,
      route: req.originalUrl
    });
    
    req.user = { userId: decoded.userId };
    next();
  } catch (err) {
    logger.error('JWT verification failed', {
      error: err,
      token: token
    });
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
