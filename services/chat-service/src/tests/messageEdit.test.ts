import request from 'supertest';
import express from 'express';
import routes from '../routes';
const app = express();
app.use(express.json());
app.use('/chat', routes);
import { query } from '../db';
import { beforeAll, afterAll, describe, it } from '@jest/globals';

describe('Message Edit API', () => {
  let chatId: number;
  let messageId: number;

  beforeAll(async () => {
    // Mock auth middleware
    const authMiddleware = (req: any, res: any, next: any) => {
      req.user = { userId: 1 };
      next();
    };
    app.use(authMiddleware);

    // Create test chat
    const chatRes = await request(app)
      .post('/chat/personal')
      .set('Authorization', 'Bearer valid-token')
      .send({ userId: 2 });
    chatId = chatRes.body.chat.id;

    // Create test message
    const messageRes = await request(app)
      .post(`/chat/${chatId}/message`)
      .set('Authorization', 'Bearer valid-token')
      .send({ content: 'Test message' });
    messageId = messageRes.body.message.id;
  });

  afterAll(async () => {
    // Cleanup
    await query('DELETE FROM messages WHERE id = $1', [messageId]);
    await query('DELETE FROM chats WHERE id = $1', [chatId]);
  });

  it('should edit message successfully', async () => {
    const res = await request(app)
      .patch(`/chat/message/${messageId}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ content: 'Edited message' });
    
    expect(res.status).toBe(200);
    expect(res.body.content).toBe('Edited message');
    expect(res.body.is_edited).toBe(true);
  });

  it('should prevent editing message older than 24 hours', async () => {
    await query('UPDATE messages SET created_at = NOW() - interval \'25 hours\' WHERE id = $1', [messageId]);
    
    const res = await request(app)
      .patch(`/chat/message/${messageId}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ content: 'Should not edit' });
    
    expect(res.status).toBe(400);
  });

  it('should prevent unauthorized editing', async () => {
    const res = await request(app)
      .patch(`/chat/message/${messageId}`)
      .set('Authorization', 'Bearer invalid-token')
      .send({ content: 'Unauthorized edit' });
    
    expect(res.status).toBe(403);
  });
});
