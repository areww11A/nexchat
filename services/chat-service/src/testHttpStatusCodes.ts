import express from 'express';
import request from 'supertest';
import { authMiddleware } from './middleware/auth.middleware';
import { logger } from './utils/logger';
import jwt from 'jsonwebtoken';
import { config } from './config';

// Create test app
const app = express();
app.use(express.json());
app.use(authMiddleware);

// Mock routes
app.get('/chat/:id/messages', (req, res) => {
  if (!req.user) return res.sendStatus(401);
  res.sendStatus(200);
});

app.get('/chat/:id', (req, res) => {
  res.sendStatus(200);
});

async function testHttpStatusCodes() {
  try {
    // Generate test tokens
    const validToken = jwt.sign({ userId: 1 }, config.jwtSecret);
    const invalidToken = 'invalid_token';

    // 1. Test unauthorized access (401)
    logger.info('Testing unauthorized access...');
    await request(app)
      .get('/chat/1/messages')
      .expect(401);

    // 2. Test invalid token (403)
    logger.info('Testing invalid token...');
    await request(app)
      .get('/chat/1/messages')
      .set('Authorization', `Bearer ${invalidToken}`)
      .expect(403);

    // 3. Test not found (404)
    logger.info('Testing not found...');
    await request(app)
      .get('/nonexistent-route')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(404);

    // 4. Test successful request (200)
    logger.info('Testing successful request...');
    await request(app)
      .get('/chat/1')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    logger.info('✅ All HTTP status code tests passed');

  } catch (error) {
    logger.error('HTTP status code test error:', error);
    process.exit(1);
  }
}

testHttpStatusCodes();
