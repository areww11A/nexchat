import request from 'supertest';
import jwt from 'jsonwebtoken';
import { db, server } from '../src/server.js';
import { WebSocket } from 'ws';
import { jest } from '@jest/globals';

let app;
let wsClient;
const testPort = 3000;

const validPublicKey = 'mock-key';

beforeAll(async () => {
  app = server;
  // Wait for server to be ready
  await new Promise(resolve => server.on('listening', resolve));
  
  // Setup test WebSocket client with valid token
  const testToken = jwt.sign(
    { userId: 1, username: 'testuser' },
    process.env.JWT_SECRET || 'nexchat_secret_2025'
  );
  wsClient = new WebSocket(`ws://localhost:${testPort}?token=${testToken}`);
  
  // Wait for WebSocket connection
  await new Promise(resolve => wsClient.on('open', resolve));
}, 10000); // Increased timeout for setup

afterAll(async () => {
  await db.close();
  server.close();
  wsClient.close();
});

describe('Message API', () => {
  let user1Id, user2Id, chatId;
  const publicKey = validPublicKey;

  beforeAll(async () => {
    // Create test users and chat
    await db.run('DELETE FROM users');
    await db.run('DELETE FROM chats');
    await db.run('DELETE FROM chat_members');
    
    const user1 = await db.run(
      'INSERT INTO users (username, passwordHash, publicKey, privateKey) VALUES (?, ?, ?, ?)',
      ['user1', 'hash1', publicKey, 'priv1']
    );
    user1Id = user1.lastID;

    const user2 = await db.run(
      'INSERT INTO users (username, passwordHash, publicKey, privateKey) VALUES (?, ?, ?, ?)',
      ['user2', 'hash2', publicKey, 'priv2']
    );
    user2Id = user2.lastID;

    const chat = await db.run(
      "INSERT INTO chats (type) VALUES ('personal')"
    );
    chatId = chat.lastID;

    await db.run(
      'INSERT INTO chat_members (chatId, userId) VALUES (?, ?)',
      [chatId, user1Id]
    );
    await db.run(
      'INSERT INTO chat_members (chatId, userId) VALUES (?, ?)',
      [chatId, user2Id]
    );
  });

  it('POST /api/message - should return 200 on success', async () => {
    const res = await request(app)
      .post('/api/message')
      .send({ 
        chatId, 
        senderId: user1Id, 
        content: 'Hello', 
        publicKey 
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('messageId');
  });

  it('POST /api/message - should return 403 when not a chat member', async () => {
    const res = await request(app)
      .post('/api/message')
      .send({ 
        chatId, 
        senderId: 999, 
        content: 'Hello', 
        publicKey 
      });
    
    expect(res.statusCode).toBe(403);
  });

  it('POST /api/message - should return 400 on invalid input', async () => {
    const res = await request(app)
      .post('/api/message')
      .send({ 
        chatId,
        senderId: user1Id,
        // Missing content and publicKey
      });
    
    expect(res.statusCode).toBe(400);
  });

  it('should emit new_message and message_read WebSocket events', async () => {
    const receivedEvents = [];
    const eventPromise = new Promise((resolve) => {
      wsClient.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log('Received WS event:', message.event);
          receivedEvents.push(message.event);
          
          if (receivedEvents.includes('new_message') && 
              receivedEvents.includes('message_read')) {
            resolve();
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      });
    });

    // Send test message
    await request(app)
      .post('/api/message')
      .send({ 
        chatId, 
        senderId: user1Id, 
        content: 'Test WS', 
        publicKey 
      });

    // Wait for both events with timeout
    await Promise.race([
      eventPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout waiting for WebSocket events')), 25000)
      )
    ]);

    expect(receivedEvents).toContain('new_message');
    expect(receivedEvents).toContain('message_read');
  });

  it('GET /api/chat/:id/messages - should return messages with pagination', async () => {
    // First create some test messages
    const testMessages = [
      {content: 'Message 1', timestamp: '2025-03-26T05:00:00Z'},
      {content: 'Message 2', timestamp: '2025-03-26T05:01:00Z'},
      {content: 'Message 3', timestamp: '2025-03-26T05:02:00Z'},
      {content: 'Message 4', timestamp: '2025-03-26T05:03:00Z'},
      {content: 'Message 5', timestamp: '2025-03-26T05:04:00Z'},
    ];

    for (const msg of testMessages) {
      await db.run(
        'INSERT INTO messages (chatId, senderId, content, encryptedContent, timestamp) VALUES (?, ?, ?, ?, ?)',
        [chatId, user1Id, msg.content, msg.content, msg.timestamp]
      );
    }

    // Test pagination
    const res1 = await request(app)
      .get(`/api/chat/${chatId}/messages`)
      .query({ limit: 2, offset: 0 });
    
    expect(res1.statusCode).toBe(200);
    expect(res1.body).toHaveLength(2);
    expect(res1.body[0].content).toBe('Message 5'); // Most recent first
    expect(res1.body[1].content).toBe('Message 4');

    const res2 = await request(app)
      .get(`/api/chat/${chatId}/messages`)
      .query({ limit: 2, offset: 2 });
    
    expect(res2.statusCode).toBe(200);
    expect(res2.body).toHaveLength(2);
    expect(res2.body[0].content).toBe('Message 3');
    expect(res2.body[1].content).toBe('Message 2');

    // Test invalid chat ID
    const res3 = await request(app)
      .get('/api/chat/999/messages');
    
    expect(res3.statusCode).toBe(404);
  });
});
