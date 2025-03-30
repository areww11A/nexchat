import request from 'supertest';
import express from 'express';
import { config } from '../config';
import { initDatabase } from '../db';
import { connectRedis } from '../redis';
import routes from '../routes';

const app = express();
app.use(express.json());
app.use('/auth', routes);

describe('Auth endpoints', () => {
  beforeAll(async () => {
    await initDatabase();
    await connectRedis();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test123!@#',
          phone: '+1234567890',
          status: 'Hello World',
          birthDate: '1990-01-01',
          language: 'en',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should not register user with existing email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser2',
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should not login with invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/logout', () => {
    let token: string;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });
      token = loginResponse.body.token;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should not logout without token', async () => {
      const response = await request(app)
        .post('/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /auth/password', () => {
    let token: string;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });
      token = loginResponse.body.token;
    });

    it('should change password successfully', async () => {
      const response = await request(app)
        .patch('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'Test123!@#',
          newPassword: 'NewTest123!@#',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verify new password works
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'NewTest123!@#',
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should not change password with wrong current password', async () => {
      const response = await request(app)
        .patch('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'NewTest123!@#',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 