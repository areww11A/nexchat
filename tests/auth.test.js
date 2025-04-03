const request = require('supertest');
const app = require('../services/auth-service/src/index');
const { pool } = require('../services/auth-service/src/config/db');
const User = require('../services/auth-service/src/models/user');
const fs = require('fs');
const path = require('path');

// Create test avatar file
const testAvatarPath = path.join(__dirname, 'test-avatar.jpg');
if (!fs.existsSync(testAvatarPath)) {
  fs.writeFileSync(testAvatarPath, 'test-avatar-content');
}

describe('Auth Service', () => {
  beforeAll(async () => {
    await User.createTable();
    await pool.query('TRUNCATE TABLE users, sessions RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await pool.end();
    if (fs.existsSync(testAvatarPath)) {
      fs.unlinkSync(testAvatarPath);
    }
  });

  afterEach(async () => {
    await pool.query('TRUNCATE TABLE users, sessions RESTART IDENTITY CASCADE');
  });

  // ... existing tests ...

  it('should change password', async () => {
    const registerRes = await request(app)
      .post('/auth/register')
      .set('User-Agent', 'jest-test')
      .send({
        username: 'passuser',
        password: 'oldpass',
        email: 'pass@example.com'
      });

    const token = registerRes.body.token;

    const res = await request(app)
      .patch('/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'oldpass',
        newPassword: 'newpass'
      });

    expect(res.status).toBe(200);
  });

  it('should update profile', async () => {
    const registerRes = await request(app)
      .post('/auth/register')
      .set('User-Agent', 'jest-test')
      .send({
        username: 'profileuser',
        password: 'profilepass',
        email: 'profile@example.com'
      });

    const token = registerRes.body.token;

    const res = await request(app)
      .patch('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'New status',
        birthDate: '1990-01-01',
        language: 'ru'
      });

    expect(res.status).toBe(200);
    expect(res.body.profile.status).toBe('New status');
  });

  it('should upload avatar', async () => {
    const registerRes = await request(app)
      .post('/auth/register')
      .set('User-Agent', 'jest-test')
      .send({
        username: 'avataruser',
        password: 'avatarpass',
        email: 'avatar@example.com'
      });

    const token = registerRes.body.token;

    const res = await request(app)
      .post('/auth/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', testAvatarPath);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('avatarUrl');
  });
});
