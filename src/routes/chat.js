import express from 'express';
import { db } from '../server.js';

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

export default router;
