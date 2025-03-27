const { jest } = require('@jest/globals');
const request = require('supertest');
const { server, db } = require('../src/server');
const fs = require('fs/promises');
const path = require('path');

// Mock authentication
jest.mock('../src/utils/auth.js', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.userId = 1;
    next();
  })
}));

describe('File Download API', () => {
  const testFilePath = path.join(process.cwd(), 'test-file.txt');
  const testStickerPath = path.join(process.cwd(), 'test-sticker.png');

  beforeAll(async () => {
    // Create test files
    await fs.writeFile(testFilePath, 'test content');
    await fs.writeFile(testStickerPath, 'sticker content');

    // Add test data to db
    await db.run(
      `INSERT INTO messages (chatId, senderId, content, encryptedContent, fileUrl) 
       VALUES (1, 1, 'test-file.txt', 'encrypted-content', ?)`,
      [testFilePath]
    );
    await db.run(
      `INSERT INTO stickers (userId, path) VALUES (1, ?)`,
      [testStickerPath]
    );
  });

  afterAll(async () => {
    // Cleanup test files
    await fs.unlink(testFilePath).catch(() => {});
    await fs.unlink(testStickerPath).catch(() => {});
  });

  test('GET /api/file/download/:messageId - should download file', async () => {
    const res = await request(server)
      .get('/api/file/download/1')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    
    expect(res.headers['content-disposition']).toContain('test-file.txt');
  });

  test('GET /api/file/stickers/:stickerId - should download sticker', async () => {
    const res = await request(server)
      .get('/api/file/stickers/1')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    
    expect(res.headers['content-disposition']).toContain('sticker-1.png');
  });

  test('GET /api/file/download/999 - should return 404 for non-existent file', async () => {
    await request(server)
      .get('/api/file/download/999')
      .expect(404);
  });
});
