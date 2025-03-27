import express from 'express';
import { db, wss } from '../server.js';
import { authenticate } from '../utils/auth.js';

const router = express.Router();

// Добавление/удаление реакции
router.post('/message/:id/reaction', authenticate, async (req, res) => {
  const { id: messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.userId;

  // Валидация
  if (!emoji || emoji.length > 10) {
    return res.status(400).json({ error: 'Invalid emoji (max 10 chars)' });
  }

  try {
    // Проверка существования сообщения
    const message = await db.get(
      'SELECT * FROM messages WHERE id = ?',
      [messageId]
    );
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Проверка доступа к чату
    const member = await db.get(
      'SELECT * FROM chat_members WHERE chatId = ? AND userId = ?',
      [message.chatId, userId]
    );
    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Проверка существующей реакции
    const existing = await db.get(
      'SELECT * FROM reactions WHERE messageId = ? AND userId = ?',
      [messageId, userId]
    );

    if (existing) {
      // Удаление реакции
      await db.run(
        'DELETE FROM reactions WHERE messageId = ? AND userId = ?',
        [messageId, userId]
      );

      // WebSocket уведомление
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({
            event: 'reaction_removed',
            data: { messageId, userId }
          }));
        }
      });
    } else {
      // Добавление реакции
      await db.run(
        'INSERT INTO reactions (messageId, userId, emoji) VALUES (?, ?, ?)',
        [messageId, userId, emoji]
      );

      // WebSocket уведомление
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({
            event: 'reaction_added',
            data: { messageId, userId, emoji }
          }));
        }
      });
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Reaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
