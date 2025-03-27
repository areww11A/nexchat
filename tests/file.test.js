import request from 'supertest';
import { server, db } from '../src/server.js';
import fs from 'fs/promises';
import path from 'path';

describe('File API Tests', () => {
  let testUserId;
  let testChatId;
  let testToken;

  beforeAll(async () => {
    // Create test user
    await db.run("DELETE FROM users");
    const user = await db.run(
      "INSERT INTO users (username, passwordHash, publicKey, privateKey) VALUES (?, ?, ?, ?)",
      ["fileuser", "hash", "pubkey", "privkey"]
    );
    testUserId = user.lastID;

    // Create test chat
    await db.run("DELETE FROM chats");
    const chat = await db.run(
      "INSERT INTO chats (type) VALUES (?)",
      ["group"]
    );
    testChatId = chat.lastID;

    // Add user to chat
    await db.run(
      "INSERT INTO chat_members (chatId, userId, role) VALUES (?, ?, ?)",
      [testChatId, testUserId, "member"]
    );

    // Create uploads directory
    try {
      await fs.mkdir('uploads', { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error('Error creating uploads directory:', err);
        throw err;
      }
    }
  });

  afterAll(async () => {
    // Cleanup uploads directory
    try {
      const files = await fs.readdir('uploads');
      for (const file of files) {
        await fs.unlink(path.join('uploads', file));
      }
      await fs.rmdir('uploads');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    await db.close();
    server.close();
  });

    it('POST /api/:chatId/file - should upload file successfully', async () => {
      const res = await request(server)
        .post(`/api/${testChatId}/file`)
        .field('senderId', testUserId)
        .attach('file', Buffer.from('test file content'), {
          filename: 'test.txt',
          contentType: 'text/plain'
        });

      console.log('Upload response:', res.status, res.body);
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('messageId');
      expect(res.body).toHaveProperty('fileUrl');

      // Verify file exists
      try {
        await fs.access(res.body.fileUrl);
        console.log('File exists at:', res.body.fileUrl);
      } catch (err) {
        console.error('File access error:', err);
        throw err;
      }

      // Verify DB record
      const message = await db.get(
        'SELECT * FROM messages WHERE id = ?',
        [res.body.messageId]
      );
      console.log('DB message record:', message);
      expect(message).toBeDefined();
    });

  it('POST /api/:chatId/file - should reject invalid file type', async () => {
    const res = await request(server)
      .post(`/api/${testChatId}/file`)
      .field('senderId', testUserId)
      .attach('file', Buffer.from('invalid content'), {
        filename: 'test.bad',
        contentType: 'application/octet-stream'
      });

    expect(res.statusCode).toBe(400);
  });

  it('POST /api/:chatId/file - should reject if not chat member', async () => {
    const res = await request(server)
      .post(`/api/${testChatId}/file`)
      .field('senderId', 999) // non-existent user
      .attach('file', Buffer.from('test content'), {
        filename: 'test.txt',
        contentType: 'text/plain'
      });

    expect(res.statusCode).toBe(403);
  });

  it('GET /api/file/:messageId - should return file info', async () => {
    // First upload a file
    const uploadRes = await request(server)
      .post(`/api/${testChatId}/file`)
      .field('senderId', testUserId)
      .attach('file', Buffer.from('test content'), {
        filename: 'test-get.txt',
        contentType: 'text/plain'
      });

    const res = await request(server)
      .get(`/api/file/${uploadRes.body.messageId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('fileUrl');
    expect(res.body).toHaveProperty('fileName', 'test-get.txt');
  });

  it('GET /api/file/:messageId - should return 404 for non-existent file', async () => {
    const res = await request(server)
      .get('/api/file/999999');

    expect(res.statusCode).toBe(404);
  });
});
