import request from 'supertest';
import { app, db } from '../src/server/index.js';

describe('Password Recovery API', () => {
  const testUser = {
    username: 'testuser_recover',
    email: 'recover@test.com',
    password: 'testpass123'
  };

  beforeAll(async () => {
    // Создаем тестового пользователя
    await db('users').insert({
      username: testUser.username,
      email: testUser.email,
      passwordHash: testUser.password,
      isOnline: false
    });
  });

  afterAll(async () => {
    // Удаляем тестового пользователя
    await db('users').where({ email: testUser.email }).del();
  });

  it('should send recovery code for existing email', async () => {
    const res = await request(app)
      .post('/api/auth/recover')
      .send({ email: testUser.email });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual('Recovery code sent');
  });

  it('should return 404 for non-existing email', async () => {
    const res = await request(app)
      .post('/api/auth/recover')
      .send({ email: 'nonexisting@test.com' });
    
    expect(res.statusCode).toEqual(404);
    expect(res.body.error).toEqual('User not found');
  });
});
