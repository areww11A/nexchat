import request from 'supertest';
import bcrypt from 'bcrypt';
import { app, db } from '../src/server/index.js';
import jwt from 'jsonwebtoken';
import authMiddleware from '../src/utils/authMiddleware.js';
const { authenticateToken } = authMiddleware;

describe('Password Change API', () => {
  const testUser = {
    username: 'testuser_pass',
    email: 'passchange@test.com',
    password: 'oldpass123'
  };
  let testToken;

  beforeAll(async () => {
    // Создаем тестового пользователя
    const passwordHash = await bcrypt.hash(testUser.password, 10);
    const [userId] = await db('users').insert({
      username: testUser.username,
      email: testUser.email,
      passwordHash,
      isOnline: false
    });

    // Генерируем токен для тестов
    testToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    // Удаляем тестового пользователя
    await db('users').where({ email: testUser.email }).del();
  });

  it('should change password with valid current password', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        currentPassword: 'oldpass123',
        newPassword: 'newpass456'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual('Password updated successfully');
  });

  it('should return 401 with invalid current password', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        currentPassword: 'wrongpass',
        newPassword: 'newpass456'
      });
    
    expect(res.statusCode).toEqual(401);
    expect(res.body.error).toEqual('Invalid current password');
  });

  it('should return 401 without token', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .send({
        currentPassword: 'oldpass123',
        newPassword: 'newpass456'
      });
    
    expect(res.statusCode).toEqual(401);
  });
});
