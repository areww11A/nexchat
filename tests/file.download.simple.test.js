import request from 'supertest';
import { server, db } from '../src/server.js';
import fs from 'fs/promises';
import path from 'path';

describe('Simple File Download Test', () => {
  const testFilePath = path.join(process.cwd(), 'test-file.txt');

  beforeAll(async () => {
    await fs.writeFile(testFilePath, 'test content');
    await db.run(
      `INSERT INTO messages (chatId, senderId, content, encryptedContent, fileUrl) 
       VALUES (1, 1, 'test-file.txt', 'encrypted-content', ?)`,
      [testFilePath]
    );
  });

  afterAll(async () => {
    await fs.unlink(testFilePath).catch(() => {});
  });

  test('GET /api/download/1 - should download file', async () => {
    // Проверим запись в БД
    const message = await db.get('SELECT * FROM messages WHERE id = 1');
    console.log('Message from DB:', message);
    
    // Проверим существование файла
    const fileExists = await fs.access(message.fileUrl).then(() => true).catch(() => false);
    console.log('File exists:', fileExists, 'at:', message.fileUrl);
    
    const res = await request(server)
      .get('/api/download/1')
      .set('Authorization', 'Bearer valid-test-token')
      .expect(200);
    
    expect(res.headers['content-disposition']).toContain('test-file.txt');
  });
});
