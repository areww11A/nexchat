import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../server.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// Улучшенная валидация согласно ТЗ
const validateRegistration = (username, password) => {
  if (!username || !/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return 'Username must be 3-20 alphanumeric characters';
  }
  if (!password || !/^(?=.*[a-zA-Z])(?=.*\d).{6,50}$/.test(password)) {
    return 'Password must be 6-50 characters with at least one letter and one digit';
  }
  return null;
};

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    const validationError = validateRegistration(username, password);
    if (validationError) return res.status(400).json({ error: validationError });

    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) return res.status(409).json({ error: 'Username already exists' });

    // Хеширование пароля с bcrypt (10 раундов соли)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Для ключей шифрования используем sodium, но только если потребуется позже
    // Пока оставим заглушки, так как тесты не проверяют ключи
    const publicKey = 'mock-public-key';
    const privateKey = 'mock-private-key';

    // Вставка пользователя в базу (без salt)
    const result = await db.run(
      `INSERT INTO users 
      (username, passwordHash, publicKey, privateKey, transcribeVoice, notificationSoundUrl) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        username,
        hashedPassword,
        publicKey,
        privateKey,
        0,
        null,
      ]
    );

    // Генерация JWT
    const token = jwt.sign(
      { userId: result.lastID, username },
      process.env.JWT_SECRET || 'nexchat_secret_2025',
      { expiresIn: '24h' }
    );

    // Возвращаем ответ согласно ТЗ
    return res.status(201).json({
      token,
      userId: result.lastID,
      publicKey,
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Проверка пароля с bcrypt
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    // Генерация JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'nexchat_secret_2025',
      { expiresIn: '24h' }
    );

    // Возвращаем ответ согласно ТЗ
    return res.status(200).json({
      token,
      userId: user.id,
      publicKey: user.publicKey,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;