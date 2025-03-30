import { Request, Response } from 'express';
import { query } from '../db';
import { verifyToken } from '../utils/jwt';

export const getProfile = async (req: Request, res: Response) => {
  try {
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

    const result = await query(
      `SELECT 
        id, username, email, phone, status, birth_date, 
        transcribe_voice, notification_sound_url, 
        is_online, last_seen, show_typing, 
        show_read_timestamps, language
      FROM users WHERE id = $1`,
      [decoded.userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        status: user.status,
        birthDate: user.birth_date,
        transcribeVoice: user.transcribe_voice,
        notificationSoundUrl: user.notification_sound_url,
        isOnline: user.is_online,
        lastSeen: user.last_seen,
        showTyping: user.show_typing,
        showReadTimestamps: user.show_read_timestamps,
        language: user.language,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
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

    const {
      username,
      phone,
      status,
      birthDate,
      language,
      transcribeVoice,
      notificationSoundUrl,
      showTyping,
      showReadTimestamps,
    } = req.body;

    // Проверка уникальности username
    if (username) {
      const existingUser = await query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, decoded.userId]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          error: 'Username already taken',
        });
      }
    }

    const result = await query(
      `UPDATE users SET 
        username = COALESCE($1, username),
        phone = COALESCE($2, phone),
        status = COALESCE($3, status),
        birth_date = COALESCE($4, birth_date),
        language = COALESCE($5, language),
        transcribe_voice = COALESCE($6, transcribe_voice),
        notification_sound_url = COALESCE($7, notification_sound_url),
        show_typing = COALESCE($8, show_typing),
        show_read_timestamps = COALESCE($9, show_read_timestamps),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING 
        id, username, email, phone, status, birth_date,
        transcribe_voice, notification_sound_url,
        is_online, last_seen, show_typing,
        show_read_timestamps, language`,
      [
        username,
        phone,
        status,
        birthDate,
        language,
        transcribeVoice,
        notificationSoundUrl,
        showTyping,
        showReadTimestamps,
        decoded.userId,
      ]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        status: user.status,
        birthDate: user.birth_date,
        transcribeVoice: user.transcribe_voice,
        notificationSoundUrl: user.notification_sound_url,
        isOnline: user.is_online,
        lastSeen: user.last_seen,
        showTyping: user.show_typing,
        showReadTimestamps: user.show_read_timestamps,
        language: user.language,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        id, username, status, is_online, last_seen
      FROM users WHERE id = $1`,
      [id]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        status: user.status,
        isOnline: user.is_online,
        lastSeen: user.last_seen,
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}; 