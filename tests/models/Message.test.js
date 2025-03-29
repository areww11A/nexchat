const { migrate, rollback, truncateTable, closeConnection } = require('../../src/db');
const Message = require('../../src/models/Message');
const User = require('../../src/models/User');
const Chat = require('../../src/models/Chat');

describe('Message Model', () => {
  let user1, user2, chat;

  beforeAll(async () => {
    console.log('Начало настройки тестов Message Model...');
    await migrate();
    console.log('Миграции успешно выполнены в beforeAll');
  });

  afterAll(async () => {
    console.log('Начало очистки после тестов Message Model...');
    await rollback();
    await closeConnection();
    console.log('Очистка успешно завершена');
  });

  beforeEach(async () => {
    console.log('Очистка таблиц перед тестом...');
    await truncateTable('message_read_status');
    await truncateTable('message_reactions');
    await truncateTable('messages');
    await truncateTable('chat_members');
    await truncateTable('chats');
    await truncateTable('users');
    console.log('Таблицы успешно очищены');

    // Создаем тестовых пользователей
    user1 = await User.createUser({
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'password123'
    });

    user2 = await User.createUser({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123'
    });

    // Создаем тестовый чат
    chat = await Chat.createPersonalChat(user1.id, user2.id);
  });

  test('создание сообщения', async () => {
    const message = await Message.create({
      chatId: chat.id,
      userId: user1.id,
      content: 'Тестовое сообщение'
    });

    expect(message).toBeDefined();
    expect(message.content).toBe('Тестовое сообщение');
    expect(message.chatId).toBe(chat.id);
    expect(message.userId).toBe(user1.id);
  });

  test('получение сообщения по ID', async () => {
    const message = await Message.create({
      chatId: chat.id,
      userId: user1.id,
      content: 'Тестовое сообщение'
    });

    const foundMessage = await Message.getById(message.id);
    expect(foundMessage).toBeDefined();
    expect(foundMessage.content).toBe('Тестовое сообщение');
    expect(foundMessage.authorName).toBe('testuser1');
  });

  test('получение сообщений чата', async () => {
    await Message.create({
      chatId: chat.id,
      userId: user1.id,
      content: 'Первое сообщение'
    });

    await Message.create({
      chatId: chat.id,
      userId: user2.id,
      content: 'Второе сообщение'
    });

    const messages = await Message.getByChatId(chat.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe('Первое сообщение');
    expect(messages[1].content).toBe('Второе сообщение');
  });

  test('редактирование сообщения', async () => {
    const message = await Message.create({
      chatId: chat.id,
      userId: user1.id,
      content: 'Исходное сообщение'
    });

    const updatedMessage = await Message.update(message.id, user1.id, 'Измененное сообщение');
    expect(updatedMessage.content).toBe('Измененное сообщение');
    expect(updatedMessage.isEdited).toBe(true);
  });

  test('мягкое удаление сообщения', async () => {
    const message = await Message.create({
      chatId: chat.id,
      userId: user1.id,
      content: 'Сообщение для удаления'
    });

    const deletedMessage = await Message.delete(message.id, user1.id);
    expect(deletedMessage.isDeleted).toBe(true);
    expect(deletedMessage.deletedAt).toBeDefined();
  });

  test('добавление и удаление реакции', async () => {
    const message = await Message.create({
      chatId: chat.id,
      userId: user1.id,
      content: 'Сообщение для реакций'
    });

    const reaction = await Message.addReaction(message.id, user2.id, '👍');
    expect(reaction).toBeDefined();
    expect(reaction.reaction).toBe('👍');

    const reactions = await Message.getReactions(message.id);
    expect(reactions).toHaveLength(1);
    expect(reactions[0].reaction).toBe('👍');
    expect(reactions[0].username).toBe('testuser2');

    await Message.removeReaction(message.id, user2.id, '👍');
    const reactionsAfterRemove = await Message.getReactions(message.id);
    expect(reactionsAfterRemove).toHaveLength(0);
  });

  test('отметка о прочтении', async () => {
    const message = await Message.create({
      chatId: chat.id,
      userId: user1.id,
      content: 'Сообщение для прочтения'
    });

    const readStatus = await Message.markAsRead(message.id, user2.id);
    expect(readStatus).toBeDefined();
    expect(readStatus.userId).toBe(user2.id);

    const readStatuses = await Message.getReadStatus(message.id);
    expect(readStatuses).toHaveLength(1);
    expect(readStatuses[0].username).toBe('testuser2');
  });

  test('поиск сообщений', async () => {
    await Message.create({
      chatId: chat.id,
      userId: user1.id,
      content: 'Сообщение о погоде'
    });

    await Message.create({
      chatId: chat.id,
      userId: user2.id,
      content: 'Сообщение о книгах'
    });

    const searchResults = await Message.search('погод');
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].content).toBe('Сообщение о погоде');
    expect(searchResults[0].authorName).toBe('testuser1');
  });
}); 