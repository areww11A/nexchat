import request from 'supertest';
import { server, db } from '../src/server.js';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
import { WebSocket } from 'ws';

describe('Checkpoint Tests', () => {
  const progressFile = 'progress.json';
  let testResults = [];

  beforeAll(async () => {
    await db.exec('DELETE FROM users');
    try { await fs.unlink(progressFile); } catch {}
  });

  describe('Group Chat API', () => {
    let creatorId, member1Id, member2Id;

    beforeAll(async () => {
      // Create test users
      await db.run('DELETE FROM users');
      
      const creator = await db.run(
        'INSERT INTO users (username, passwordHash, publicKey, privateKey) VALUES (?, ?, ?, ?)',
        ['creator', 'hash1', 'pubkey1', 'privkey1']
      );
      creatorId = creator.lastID;

      const member1 = await db.run(
        'INSERT INTO users (username, passwordHash, publicKey, privateKey) VALUES (?, ?, ?, ?)',
        ['member1', 'hash2', 'pubkey2', 'privkey2']
      );
      member1Id = member1.lastID;

      const member2 = await db.run(
        'INSERT INTO users (username, passwordHash, publicKey, privateKey) VALUES (?, ?, ?, ?)',
        ['member2', 'hash3', 'pubkey3', 'privkey3']
      );
      member2Id = member2.lastID;
    });

    it('POST /api/chat/group - should create group chat', async () => {
      const res = await request(server)
        .post('/api/chat/group')
        .send({
          creatorId,
          name: 'Test Group',
          members: [
            {userId: member1Id, role: 'member'},
            {userId: member2Id, role: 'member'}
          ]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('chatId');
      expect(res.body).toHaveProperty('name', 'Test Group');
    });

    it('POST /api/chat/group - should return 400 for invalid input', async () => {
      const res = await request(server)
        .post('/api/chat/group')
        .send({
          // Missing creatorId
          name: 'Invalid Group',
          members: []
        });

      expect(res.statusCode).toBe(400);
    });

    it('POST /api/chat/group - should return 404 for non-existent users', async () => {
      const res = await request(server)
        .post('/api/chat/group')
        .send({
          creatorId: 999,
          name: 'Invalid Group',
          members: []
        });

      expect(res.statusCode).toBe(404);
    });
  });

  afterEach(async () => {
    await fs.writeFile(progressFile, JSON.stringify(testResults, null, 2));
  });

  afterAll(async () => {
    await db.close();
    const progress = { checkpoint: '1.1.2', status: 'completed', timestamp: new Date().toISOString() };
    await fs.writeFile(progressFile, JSON.stringify(progress, null, 2));
    server.close();
  });

  describe('Auth API', () => {
    it('POST /api/auth/register - should return 201 on success', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'testpass1' });
      
      testResults.push({
        test: 'register-201',
        status: res.statusCode === 201 ? 'passed' : 'failed',
        expected: 201,
        actual: res.statusCode,
      });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('userId');
      expect(res.body).toHaveProperty('publicKey');
    });

    it('POST /api/auth/register - should return 400 on invalid input', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ username: '', password: 'short' });
      
      testResults.push({
        test: 'register-400',
        status: res.statusCode === 400 ? 'passed' : 'failed',
        expected: 400,
        actual: res.statusCode
      });
      
      expect(res.statusCode).toEqual(400);
    });

    it('POST /api/auth/register - should return 409 on duplicate username', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'testpass1' }); // Исправлено на testpass1
    
      const res = await request(server)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'testpass1' }); // Исправлено на testpass1
      
      testResults.push({
        test: 'register-409',
        status: res.statusCode === 409 ? 'passed' : 'failed',
        expected: 409,
        actual: res.statusCode
      });
      
      expect(res.statusCode).toEqual(409);
    });
    
    it('POST /api/auth/login - should return 200 with valid credentials', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'testpass1' });
    
      const res = await request(server)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'testpass1' });
      
      testResults.push({
        test: 'login-200',
        status: res.statusCode === 200 ? 'passed' : 'failed',
        expected: 200,
        actual: res.statusCode,
      });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('userId');
      expect(res.body).toHaveProperty('publicKey');
      expect(() => jwt.verify(res.body.token, 'nexchat_secret_2025')).not.toThrow();
    });

    it('POST /api/auth/login - should return 401 with invalid credentials', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ username: 'wronguser', password: 'wrongpass' });
      
      testResults.push({
        test: 'login-401',
        status: res.statusCode === 401 ? 'passed' : 'failed',
        expected: 401,
        actual: res.statusCode
      });
      
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('WebSocket', () => {
    let validToken;

    beforeAll(async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ username: 'wsuser', password: 'wspass' });
      
      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({ username: 'wsuser', password: 'wspass' });
      
      validToken = loginRes.body.token;
    });

    it('should connect with valid token', (done) => {
      const ws = new WebSocket(`ws://localhost:3000?token=${validToken}`);
      
      ws.on('open', () => {
        testResults.push({
          test: 'websocket-200',
          status: 'passed'
        });
        ws.close();
        done();
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        expect(message.event).toEqual('connected');
        expect(message).toHaveProperty('userId');
      });
    });

    it('should reject connection with invalid token', (done) => {
      const ws = new WebSocket('ws://localhost:3000?token=invalid');
      
      ws.on('close', (code) => {
        testResults.push({
          test: 'websocket-401',
          status: code === 4401 ? 'passed' : 'failed',
          expected: 4401,
          actual: code
        });
        expect(code).toEqual(4401);
        done();
      });
    });
  });

  describe('Chat API', () => {
    let user1Id, user2Id;

    beforeAll(async () => {
      // Create test users
      await db.run("INSERT INTO users (username, passwordHash, publicKey, privateKey) VALUES ('chatuser1', 'chathash1', 'test_public_key', 'test_private_key')");
      await db.run("INSERT INTO users (username, passwordHash, publicKey, privateKey) VALUES ('chatuser2', 'chathash2', 'test_public_key', 'test_private_key')");
      const users = await db.all('SELECT id FROM users');
      user1Id = users[0].id;
      user2Id = users[1].id;
    });

    afterAll(async () => {
      await db.exec('DELETE FROM chat_members');
      await db.exec('DELETE FROM chats');
      await db.exec('DELETE FROM users');
    });

    it('POST /api/chat/personal - should return 200 on success', async () => {
      const res = await request(server)
        .post('/api/chat/personal')
        .send({ userId1: user1Id, userId2: user2Id });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('chatId');
      expect(typeof res.body.chatId).toBe('number');
    });

    it('POST /api/chat/personal - should return 400 when creating chat with oneself', async () => {
      const res = await request(server)
        .post('/api/chat/personal')
        .send({ userId1: user1Id, userId2: user1Id });
      expect(res.statusCode).toBe(400);
    });

    it('POST /api/chat/personal - should return 409 on duplicate chat', async () => {
      await request(server)
        .post('/api/chat/personal')
        .send({ userId1: user1Id, userId2: user2Id });
      const res = await request(server)
        .post('/api/chat/personal')
        .send({ userId1: user1Id, userId2: user2Id });
      expect(res.statusCode).toBe(409);
    });

    it('POST /api/chat/personal - should return 404 if user does not exist', async () => {
      const res = await request(server)
        .post('/api/chat/personal')
        .send({ userId1: 999, userId2: user2Id });
      expect(res.statusCode).toBe(404);
    });
  });
});
