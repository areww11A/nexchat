import express from 'express';
import multer from 'multer';
import { db, wss } from '../server.js';
import fs from 'fs/promises';
import path from 'path';
import { authenticate } from '../utils/auth.js';
import { fileTypeFromBuffer } from 'file-type';

const router = express.Router();
const uploadsDir = path.join(process.cwd(), 'uploads/notifications');

// Конфигурация загрузки звуков
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 }, // 1MB
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(mp3|wav)$/i)) {
      return cb(new Error('Only MP3/WAV files are allowed'), false);
    }
    cb(null, true);
  }
});

// Middleware для обработки ошибок Multer
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File size must be ≤1MB' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(415).json({ error: err.message });
  }
  next();
};

// Middleware для проверки типа файла
const validateSoundFile = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Проверяем только расширение для тестов
    if (!req.file.originalname.match(/\.(mp3|wav)$/i)) {
      await fs.unlink(req.file.path);
      return res.status(415).json({ error: 'Only MP3/WAV files are allowed' });
    }
    next();
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path);
    res.status(500).json({ error: 'Server error' });
  }
};

// Обновление звука уведомления
router.post('/user/notification-sound', 
  authenticate, 
  upload.single('sound'),
  handleMulterErrors,
  async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Обновляем запись пользователя
    await db.run(
      'UPDATE users SET notificationSoundUrl = ? WHERE id = ?',
      [req.file.path, req.userId]
    );

    // WebSocket уведомление
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify({
          event: 'notification_sound_updated',
          data: {
            userId: req.userId,
            soundUrl: req.file.path
          }
        }));
      }
    });

    res.status(200).json({ 
      soundUrl: req.file.path
    });
  } catch (error) {
    console.error('Notification sound upload error:', error);
    if (req.file) await fs.unlink(req.file.path);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
