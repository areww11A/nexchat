import request from 'supertest';
import { server, db } from '../src/server.js';
import fs from 'fs/promises';
import path from 'path';

describe('Notification Sound API Tests', () => {
  let testUserId;
  const testSoundPath = path.join(process.cwd(), 'tests', 'test-sound.mp3');
  const largeSoundPath = path.join(process.cwd(), 'tests', 'large-sound.mp3');
  const invalidFile = path.join(process.cwd(), 'tests', 'invalid.txt');

  beforeAll(async () => {
    // Создаем тестового пользователя
    await db.run(
      `INSERT INTO users (username, passwordHash, publicKey, privateKey) 
       VALUES ('testuser', 'hash', 'pubkey', 'privkey')`
    );
    testUserId = (await db.get('SELECT last_insert_rowid() as id')).id;

    // Создаем тестовые файлы
    await fs.writeFile(testSoundPath, Buffer.alloc(100000)); // ~1 секунда звука
    await fs.writeFile(largeSoundPath, Buffer.alloc(2 * 1024 * 1024)); // 2MB
    await fs.writeFile(invalidFile, 'invalid content');
  });

  afterAll(async () => {
    // Удаляем тестовые файлы
    await Promise.all([
      fs.unlink(testSoundPath).catch(() => {}),
      fs.unlink(largeSoundPath).catch(() => {}),
      fs.unlink(invalidFile).catch(() => {})
    ]);
  });

  test('POST /api/user/notification-sound - should upload sound', async () => {
    const res = await request(server)
      .post('/api/user/notification-sound')
      .set('Authorization', 'Bearer valid-test-token')
      .set('Content-Type', 'multipart/form-data')
      .attach('sound', testSoundPath, { contentType: 'audio/mpeg' })
      .expect(200);

    expect(res.body).toHaveProperty('soundUrl');
  });

  test('POST /api/user/notification-sound - should return 413 for large file', async () => {
    await request(server)
      .post('/api/user/notification-sound')
      .set('Authorization', 'Bearer valid-test-token')
      .set('Content-Type', 'multipart/form-data')
      .attach('sound', largeSoundPath, { contentType: 'audio/mpeg' })
      .expect(413);
  });

  test('POST /api/user/notification-sound - should return 415 for invalid type', async () => {
    await request(server)
      .post('/api/user/notification-sound')
      .set('Authorization', 'Bearer valid-test-token')
      .set('Content-Type', 'multipart/form-data')
      .attach('sound', invalidFile, { contentType: 'text/plain' })
      .expect(415);
  });

  test('POST /api/user/notification-sound - should return 400 for no file', async () => {
    await request(server)
      .post('/api/user/notification-sound')
      .set('Authorization', 'Bearer valid-test-token')
      .expect(400);
  });
});
