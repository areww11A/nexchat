import request from 'supertest';
import express from 'express';
import { config } from '../config';
import { beforeAll, afterAll, describe, it, beforeEach } from '@jest/globals';
import { initDatabase } from '../db';
import { connectRedis, disconnectRedis } from '../redis';
import routes from '../routes';

const app = express();
app.use(express.json());
app.use('/chat', routes);

describe('Chat endpoints', () => {
  let authToken: string;

  beforeAll(async () => {
    await initDatabase();
    await connectRedis();
    
    // Get auth token for tests
    const authResponse = await request('http://localhost:3001')
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#'
      });
    authToken = authResponse.body.token;
  });

  afterAll(async () => {
    await disconnectRedis();
  });

  describe('POST /chat/personal', () => {
    it('should create personal chat', async () => {
      const response = await request(app)
        .post('/chat/personal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 2 // ID of other user
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('chat');
      expect(response.body.chat).toHaveProperty('id');
      expect(response.body.chat.type).toBe('personal');
    });
  });

  describe('POST /chat/:id/message', () => {
    let chatId: number;

    beforeEach(async () => {
      const chatResponse = await request(app)
        .post('/chat/personal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: 2 });
      chatId = chatResponse.body.chat.id;
    });

    it('should send message to chat', async () => {
      const response = await request(app)
        .post(`/chat/${chatId}/message`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test message'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message.content).toBe('Test message');
    });
  });

  describe('POST /chat/:id/block', () => {
    let chatId: number;

    beforeEach(async () => {
      const chatResponse = await request(app)
        .post('/chat/personal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: 2 });
      chatId = chatResponse.body.chat.id;
    });

    it('should block user in personal chat', async () => {
      const response = await request(app)
        .post(`/chat/${chatId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 2
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });
});
