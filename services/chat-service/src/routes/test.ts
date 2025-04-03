import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();

router.get('/verify-token', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }
    
    const decoded = jwt.verify(token, config.jwtSecret);
    logger.debug('Token verified successfully:', decoded);
    res.json({ valid: true, decoded });
  } catch (error) {
    logger.error('Token verification failed:', error);
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

export default router;
