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

export default router;
