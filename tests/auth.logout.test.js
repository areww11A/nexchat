import request from 'supertest';
import { app, db, startServer, stopServer } from '../src/server/index.js';
import jwt from 'jsonwebtoken';

describe('Logout API', () => {
  const testUser = {
    username: 'testuser_logout',
    email: 'logout@test.com',
    password: 'testpass123'
  };
  let testToken;
  let userId;
  let server;

  beforeAll(async () => {
    server = await startServer();
    
    // Create test user
    [userId] = await db('users').insert({
      username: testUser.username,
      email: testUser.email,
      passwordHash: testUser.password,
      isOnline: 1
    });

    // Generate test token
    testToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    // Cleanup
    await db('users').where({ id: userId }).del();
    await stopServer();
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for server to close
  });

  it('should logout user and update status', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${testToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual('Logged out successfully');

    // Verify DB update
    const user = await db('users').where({ id: userId }).first();
    expect(user.isOnline).toBe(0);
    expect(user.lastSeen).not.toBeNull();
  });

  it('should return 401 without token', async () => {
    const res = await request(app)
      .post('/api/auth/logout');
    
    expect(res.statusCode).toEqual(401);
  });
});
