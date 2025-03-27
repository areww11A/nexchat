import request from 'supertest';
import { server, db } from '../src/server.js';
import fs from 'fs/promises';
import path from 'path';

describe('Avatar API Tests', () => {
  const testImagePath = path.join(process.cwd(), 'test-avatar.png');
  let testUserId = 1;
  let testChatId = 1;

  beforeAll(async () => {
    // Создаем тестовый файл аватарки
    await fs.writeFile(testImagePath, 'test image content');

    // Создаем тестового пользователя
    await db.run(
      `INSERT INTO users (username, passwordHash, publicKey, privateKey) 
       VALUES ('testuser', 'hash', 'pubkey', 'privkey')`
    );
    testUserId = (await db.get('SELECT last_insert_rowid() as id')).id;

    // Создаем тестовый чат
    await db.run(
      `INSERT INTO chats (type, name) VALUES ('group', 'Test Chat')`
    );
    testChatId = (await db.get('SELECT last_insert_rowid() as id')).id;

    // Добавляем пользователя в чат
    await db.run(
      `INSERT INTO chat_members (chatId, userId, role) VALUES (?, ?, 'admin')`,
      [testChatId, testUserId]
    );
  });

  afterAll(async () => {
    await fs.unlink(testImagePath).catch(() => {});
  });

  test('POST /api/user/avatar - should upload user avatar', async () => {
    const res = await request(server)
      .post('/api/user/avatar')
      .set('Authorization', 'Bearer valid-test-token')
      .attach('avatar', testImagePath)
      .expect(200);

    expect(res.body).toHaveProperty('avatarUrl');
    expect(res.body.avatarUrl).toMatch(/uploads\/avatars/);
  });

  test('POST /api/chat/1/avatar - should upload chat avatar', async () => {
    const res = await request(server)
      .post(`/api/chat/${testChatId}/avatar`)
      .set('Authorization', 'Bearer valid-test-token')
      .attach('avatar', testImagePath)
      .expect(200);

    expect(res.body).toHaveProperty('avatarUrl');
    expect(res.body.avatarUrl).toMatch(/uploads\/avatars/);
  });

  test('POST /api/chat/999/avatar - should return 403 for non-member', async () => {
    await request(server)
      .post('/api/chat/999/avatar')
      .set('Authorization', 'Bearer valid-test-token')
      .attach('avatar', testImagePath)
      .expect(403);
  });

  test('POST /api/user/avatar - should return 400 for invalid file', async () => {
    await request(server)
      .post('/api/user/avatar')
      .set('Authorization', 'Bearer valid-test-token')
      .attach('avatar', Buffer.from('invalid'), { filename: 'test.txt' })
      .expect(400);
  });
});
