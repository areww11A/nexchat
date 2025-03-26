import express from 'express';
import { db, server } from '../server.js';
import { WebSocketServer } from 'ws';
import sodium from 'libsodium-wrappers';

const router = express.Router();

// Шифрование сообщения
async function encryptMessage(content, publicKey) {
  await sodium.ready;
  const key = sodium.from_base64(publicKey);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encrypted = sodium.crypto_secretbox_easy(content, nonce, key);
  return {
    encrypted: sodium.to_base64(encrypted),
    nonce: sodium.to_base64(nonce)
  };
}

// Отправка сообщения
router.post('/api/message', async (req, res) => {
  const { chatId, senderId, content, publicKey } = req.body;

  if (!chatId || !senderId || !content || !publicKey) {
    return res.status(400).json({ error: 'Недостаточно данных' });
  }

  try {
    // Проверка прав доступа
    const member = await db.get(
      'SELECT * FROM chat_members WHERE chatId = ? AND userId = ?',
      [chatId, senderId]
    );
    
    if (!member) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Шифрование сообщения
    const { encrypted, nonce } = await encryptMessage(content, publicKey);

    // Сохранение в БД
    const result = await db.run(
      'INSERT INTO messages (chatId, senderId, content, encryptedContent) VALUES (?, ?, ?, ?)',
      [chatId, senderId, content, encrypted]
    );

    // WebSocket уведомление
    const wss = new WebSocketServer({ noServer: true });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          event: 'new_message',
          data: {
            messageId: result.lastID,
            chatId,
            senderId,
            content: encrypted,
            nonce,
            timestamp: new Date().toISOString()
          }
        }));
      }
    });

    res.status(200).json({ 
      messageId: result.lastID,
      status: 'Сообщение отправлено'
    });

  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
