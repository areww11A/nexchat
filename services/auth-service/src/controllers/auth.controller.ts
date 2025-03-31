import { Request, Response } from 'express';
import { query } from '../db';
import { generateToken, verifyToken } from '../utils/jwt';
import { hashPassword, comparePasswords } from '../utils/password';
import { setSession, deleteSession } from '../redis';
import { sendRecoveryEmail } from '../utils/email';
import { generateRecoveryCode } from '../utils/code';

export const register = async (req: Request, res: Response) => {
  try {
    const {
      username,
      email,
      password,
      phone,
      status,
      birthDate,
      language,
    } = req.body;

    // Проверка существующего пользователя
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'User with this username or email already exists',
      });
    }

    // Хеширование пароля
    const passwordHash = await hashPassword(password);

    // Создание пользователя
    const result = await query(
      `INSERT INTO users (
        username, email, password_hash, phone, status, birth_date, language
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, email, phone, status, birth_date, language`,
      [username, email, passwordHash, phone, status, birthDate, language]
    );

    const user = result.rows[0];

    // Генерация токена
    const token = generateToken(user.id);

    // Создание сессии
    await setSession(token, user.id, req.headers['user-agent'] || 'unknown', req.ip || 'unknown');

    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Поиск пользователя
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
      });
    }

    // Проверка пароля
    const isValidPassword = await comparePasswords(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
      });
    }

    // Генерация токена
    const token = generateToken(user.id);

    // Создание сессии
    await setSession(token, user.id, req.headers['user-agent'] || 'unknown', req.ip || 'unknown');

    // Обновление статуса онлайн
    await query(
      'UPDATE users SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        status: user.status,
        birthDate: user.birth_date,
        language: user.language,
        isOnline: true,
        lastSeen: user.last_seen,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
      });
    }

    // Удаление сессии
    await deleteSession(token);

    // Обновление статуса оффлайн
    const decoded = verifyToken(token);
    if (decoded) {
      await query(
        'UPDATE users SET is_online = false, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
        [decoded.userId]
      );
    }

    res.json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid token',
      });
    }

    // Получение пользователя
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [decoded.userId]
    );

    const user = result.rows[0];

    // Проверка текущего пароля
    const isValidPassword = await comparePasswords(currentPassword, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Current password is incorrect',
      });
    }

    // Хеширование нового пароля
    const newPasswordHash = await hashPassword(newPassword);

    // Обновление пароля
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, decoded.userId]
    );

    res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
};

export const checkSchema = async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'users'`
    );
    const columns = result.rows.map(row => row.column_name);
    res.json({
      table: 'users',
      columns: columns,
      hasRecoveryColumns: columns.includes('recovery_code') && columns.includes('recovery_code_expires'),
      hasAvatarColumn: columns.includes('avatar_url')
    });
  } catch (error) {
    console.error('Schema check error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
};

export const resetPasswordWithCode = async (req: Request, res: Response) => {
  try {
    const { recoveryCode, newPassword } = req.body;

    // Find user with matching recovery code
    const result = await query(
      `SELECT id FROM users 
       WHERE recovery_code = $1 
       AND recovery_code_expires > NOW()`,
      [recoveryCode]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired recovery code',
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear recovery code
    await query(
      `UPDATE users 
       SET password_hash = $1,
           recovery_code = NULL,
           recovery_code_expires = NULL
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    res.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
};

export const recoverPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Поиск пользователя
    const result = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Генерация кода восстановления
    const recoveryCode = generateRecoveryCode();
    const recoveryCodeExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 минут

    // Сохранение кода в базе
    await query(
      'UPDATE users SET recovery_code = $1, recovery_code_expires = $2 WHERE id = $3',
      [recoveryCode, recoveryCodeExpires, user.id]
    );

    // В тестовом режиме просто возвращаем код
    res.json({
      message: 'Recovery code generated (email sending disabled in test mode)',
      recoveryCode: recoveryCode,
      expiresAt: recoveryCodeExpires
    });
  } catch (error) {
    console.error('Password recovery error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
};
