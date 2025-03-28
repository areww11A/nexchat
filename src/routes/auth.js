import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../server/index.js';
import middleware from '../utils/authMiddleware.js';
const { authenticateToken: authMiddleware } = middleware;

const router = express.Router();
const saltRounds = 10;

// Генерация кода восстановления
function generateRecoveryCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Регистрация пользователя
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Проверка существования пользователя
    const userExists = await db('users').where({ email }).orWhere({ username }).first();
    if (userExists) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Создание пользователя
    const [userId] = await db('users').insert({
      username,
      email,
      passwordHash: await bcrypt.hash(password, saltRounds),
      isOnline: true,
      lastSeen: new Date()
    });

    // Генерация JWT токена
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Вход пользователя
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await db('users').where({ email }).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Обновление статуса онлайн
    await db('users').where({ id: user.id }).update({
      isOnline: true,
      lastSeen: new Date()
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Восстановление пароля
router.post('/recover', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db('users').where({ email }).first();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const recoveryCode = generateRecoveryCode();
    // В реальном приложении здесь должна быть отправка кода на email
    console.log(`Recovery code for ${email}: ${recoveryCode}`);

    await db('users').where({ id: user.id }).update({
      recoveryCode,
      recoveryCodeExpires: new Date(Date.now() + 3600000) // 1 час
    });

    res.status(200).json({ message: 'Recovery code sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Recovery failed' });
  }
});

// Смена пароля
router.patch('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Comparing passwords:', { currentPassword, storedHash: user.passwordHash });
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    console.log('Password valid:', validPassword);
    if (!validPassword) {
      console.log('Invalid password provided');
      return res.status(401).json({ error: 'Invalid current password' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    await db('users').where({ id: userId }).update({
      passwordHash: newPasswordHash
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Выход пользователя
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    await db('users').where({ id: req.user.userId }).update({
      isOnline: false,
      lastSeen: new Date()
    });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
