import express from 'express';
import { db, wss } from '../server.js';

const router = express.Router();

router.post('/personal', async (req, res) => {
  const { userId1, userId2 } = req.body;

  // Validate input
  if (!userId1 || !userId2) {
    return res.status(400).json({ error: 'Требуются оба ID пользователей' });
  }

  if (userId1 === userId2) {
    return res.status(400).json({ error: 'Нельзя создать чат с самим собой' });
  }

  try {
    // Check users exist
    const userExists = await db.get(
      'SELECT COUNT(*) as count FROM users WHERE id IN (?, ?)',
      [userId1, userId2]
    );
    
    if (userExists.count !== 2) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Check for existing chat
    const existingChat = await db.get(
      `SELECT c.id 
       FROM chats c
       JOIN chat_members cm1 ON c.id = cm1.chatId
       JOIN chat_members cm2 ON c.id = cm2.chatId
       WHERE c.type = 'personal'
         AND cm1.userId = ? 
         AND cm2.userId = ?`,
      [userId1, userId2]
    );

    if (existingChat) {
      return res.status(409).json({ error: 'Чат уже существует' });
    }

    // Create new chat
    const chatResult = await db.run(
      'INSERT INTO chats (type) VALUES (?)',
      ['personal']
    );
    
    // Add members
    await db.run(
      'INSERT INTO chat_members (chatId, userId) VALUES (?, ?)',
      [chatResult.lastID, userId1]
    );
    await db.run(
      'INSERT INTO chat_members (chatId, userId) VALUES (?, ?)',
      [chatResult.lastID, userId2]
    );

    res.status(200).json({ 
      chatId: chatResult.lastID,
      message: 'Личный чат успешно создан'
    });

  } catch (error) {
    console.error('Ошибка создания чата:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение сообщений с пагинацией
router.get('/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  try {
    // Проверка существования чата
    const chatExists = await db.get(
      'SELECT id FROM chats WHERE id = ?',
      [id]
    );
    
    if (!chatExists) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    // Получение сообщений (новые первыми)
    const messages = await db.all(
      `SELECT m.id, m.senderId, m.content, m.timestamp, u.username 
       FROM messages m
       JOIN users u ON m.senderId = u.id
       WHERE m.chatId = ?
       ORDER BY m.timestamp DESC
       LIMIT ? OFFSET ?`,
      [id, limit, offset]
    );

    res.status(200).json(messages);
  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание группового чата
router.post('/group', async (req, res) => {
  const { creatorId, name, members } = req.body;

  // Валидация входных данных
  if (!creatorId || !name || !Array.isArray(members)) {
    return res.status(400).json({ error: 'Неверные входные данные' });
  }

  try {
    // Проверка существования создателя
    const creatorExists = await db.get(
      'SELECT id FROM users WHERE id = ?',
      [creatorId]
    );
    
    if (!creatorExists) {
      return res.status(404).json({ error: 'Создатель не найден' });
    }

    // Проверка существования участников
    const memberIds = members.map(m => m.userId);
    const usersExist = await db.get(
      'SELECT COUNT(*) as count FROM users WHERE id IN (' + 
      memberIds.map(() => '?').join(',') + ')',
      memberIds
    );
    
    if (usersExist.count !== memberIds.length) {
      return res.status(404).json({ error: 'Один из участников не найден' });
    }

    // Создание группового чата
    const chatResult = await db.run(
      'INSERT INTO chats (type, name) VALUES (?, ?)',
      ['group', name]
    );

    // Добавление создателя как админа
    await db.run(
      'INSERT INTO chat_members (chatId, userId, role) VALUES (?, ?, ?)',
      [chatResult.lastID, creatorId, 'admin']
    );

    // Добавление участников
    for (const member of members) {
      await db.run(
        'INSERT INTO chat_members (chatId, userId, role) VALUES (?, ?, ?)',
        [chatResult.lastID, member.userId, member.role || 'member']
      );
    }

    res.status(201).json({ 
      chatId: chatResult.lastID,
      name,
      type: 'group'
    });

  } catch (error) {
    console.error('Ошибка создания группового чата:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Модерация чата
router.post('/:id/moderate', async (req, res) => {
  const { id } = req.params;
  const { action, messageId, userId, moderatorId } = req.body;

  try {
    // Проверка прав модератора
    const moderator = await db.get(
      'SELECT role FROM chat_members WHERE chatId = ? AND userId = ?',
      [id, moderatorId]
    );
    
    if (!moderator || moderator.role !== 'admin') {
      return res.status(403).json({ error: 'Требуются права администратора' });
    }

    if (action === 'delete' && messageId) {
      await db.run('DELETE FROM messages WHERE id = ?', [messageId]);
      
      // WebSocket событие
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({
            event: 'message_deleted',
            data: { chatId: id, messageId }
          }));
        }
      });
    } 
    else if (action === 'ban' && userId) {
      await db.run(
        'DELETE FROM chat_members WHERE chatId = ? AND userId = ?',
        [id, userId]
      );
      
      // WebSocket событие
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({
            event: 'user_banned',
            data: { chatId: id, userId }
          }));
        }
      });
    } else {
      return res.status(400).json({ error: 'Неверное действие' });
    }

    res.status(200).json({ status: 'Успешно' });
  } catch (error) {
    console.error('Ошибка модерации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Закрепление сообщения
router.post('/:id/pin', async (req, res) => {
  const { id } = req.params;
  const { messageId, moderatorId } = req.body;

  try {
    // Проверка прав модератора
    const moderator = await db.get(
      'SELECT role FROM chat_members WHERE chatId = ? AND userId = ?',
      [id, moderatorId]
    );
    
    if (!moderator || moderator.role !== 'admin') {
      return res.status(403).json({ error: 'Требуются права администратора' });
    }

    // Проверка существования сообщения
    const message = await db.get(
      'SELECT id FROM messages WHERE id = ? AND chatId = ?',
      [messageId, id]
    );
    
    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    // Закрепление сообщения
    await db.run(
      'INSERT OR REPLACE INTO pinned_messages (chatId, messageId) VALUES (?, ?)',
      [id, messageId]
    );

    // WebSocket событие
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify({
          event: 'message_pinned',
          data: { chatId: id, messageId }
        }));
      }
    });

    res.status(200).json({ status: 'Сообщение закреплено' });
  } catch (error) {
    console.error('Ошибка закрепления сообщения:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение информации о чате
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Получаем основную информацию о чате
    const chat = await db.get(
      'SELECT id, type, name, createdAt FROM chats WHERE id = ?',
      [id]
    );
    
    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    // Получаем список участников
    const members = await db.all(
      `SELECT u.id, u.username, cm.role 
       FROM chat_members cm
       JOIN users u ON cm.userId = u.id
       WHERE cm.chatId = ?`,
      [id]
    );

    // Получаем закрепленные сообщения
    const pinnedMessages = await db.all(
      `SELECT pm.messageId, m.content, m.senderId, u.username as senderName
       FROM pinned_messages pm
       JOIN messages m ON pm.messageId = m.id
       JOIN users u ON m.senderId = u.id
       WHERE pm.chatId = ?`,
      [id]
    );

    res.status(200).json({
      ...chat,
      members,
      pinnedMessages
    });

  } catch (error) {
    console.error('Ошибка получения информации о чате:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
