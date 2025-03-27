import request from 'supertest';
import { server, db } from '../src/server.js';

describe('Reaction API Tests', () => {
  let testUserId;
  let testChatId;
  let testMessageId;

  beforeAll(async () => {
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
      `INSERT INTO chat_members (chatId, userId, role) VALUES (?, ?, 'member')`,
      [testChatId, testUserId]
    );

    // Создаем тестовое сообщение
    await db.run(
      `INSERT INTO messages (chatId, senderId, content, encryptedContent)
       VALUES (?, ?, 'Test message', 'encrypted')`,
      [testChatId, testUserId]
    );
    testMessageId = (await db.get('SELECT last_insert_rowid() as id')).id;
  });

  test('POST /api/message/:id/reaction - should add reaction', async () => {
    const res = await request(server)
      .post(`/api/message/${testMessageId}/reaction`)
      .set('Authorization', 'Bearer valid-test-token')
      .send({ emoji: '👍' })
      .expect(200);

    expect(res.body).toHaveProperty('status', 'success');
  });

  test('POST /api/message/:id/reaction - should remove reaction', async () => {
    // Сначала добавляем реакцию
    await request(server)
      .post(`/api/message/${testMessageId}/reaction`)
      .set('Authorization', 'Bearer valid-test-token')
      .send({ emoji: '👍' });

    // Затем удаляем
    const res = await request(server)
      .post(`/api/message/${testMessageId}/reaction`)
      .set('Authorization', 'Bearer valid-test-token')
      .send({ emoji: '👍' })
      .expect(200);

    expect(res.body).toHaveProperty('status', 'success');
  });

  test('POST /api/message/:id/reaction - should return 400 for invalid emoji', async () => {
    await request(server)
      .post(`/api/message/${testMessageId}/reaction`)
      .set('Authorization', 'Bearer valid-test-token')
      .send({ emoji: 'toolongemoji' })
      .expect(400);
  });

  test('POST /api/message/:id/reaction - should return 404 for non-existent message', async () => {
    await request(server)
      .post('/api/message/999/reaction')
      .set('Authorization', 'Bearer valid-test-token')
      .send({ emoji: '👍' })
      .expect(404);
  });

  test('POST /api/message/:id/reaction - should return 403 for non-member', async () => {
    // Создаем новый чат, где пользователь не состоит
    await db.run(`INSERT INTO chats (type, name) VALUES ('group', 'Private Chat')`);
    const privateChatId = (await db.get('SELECT last_insert_rowid() as id')).id;
    
    // Создаем сообщение в этом чате
    await db.run(
      `INSERT INTO messages (chatId, senderId, content, encryptedContent)
       VALUES (?, 1, 'Private message', 'encrypted')`,
      [privateChatId]
    );
    const privateMessageId = (await db.get('SELECT last_insert_rowid() as id')).id;

    await request(server)
      .post(`/api/message/${privateMessageId}/reaction`)
      .set('Authorization', 'Bearer valid-test-token')
      .send({ emoji: '👍' })
      .expect(403);
  });
});
