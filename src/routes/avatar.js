import express from 'express';
import multer, { MulterError } from 'multer';
import { db, wss } from '../server.js';
import fs from 'fs/promises';
import path from 'path';
import { authenticate } from '../utils/auth.js';

const router = express.Router();
const uploadsDir = path.join(process.cwd(), 'uploads/avatars');

// Configure avatar upload
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG/PNG images are allowed'), false);
    }
  }
});

// Update user avatar
router.post('/user/avatar', authenticate, (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err instanceof MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Update user record
      await db.run(
        'UPDATE users SET avatarUrl = ? WHERE id = ?',
        [req.file.path, req.userId]
      );

      // Notify via WebSocket
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({
            event: 'avatar_updated',
            data: {
              userId: req.userId,
              avatarUrl: req.file.path
            }
          }));
        }
      });

      res.status(200).json({ 
        avatarUrl: req.file.path
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      await fs.unlink(req.file.path);
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// Update chat avatar
router.post('/chat/:id/avatar', authenticate, (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err instanceof MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Verify user is chat member
      const member = await db.get(
        'SELECT * FROM chat_members WHERE chatId = ? AND userId = ?',
        [req.params.id, req.userId]
      );
      
      if (!member) {
        await fs.unlink(req.file.path);
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update chat record
      await db.run(
        'UPDATE chats SET avatarUrl = ? WHERE id = ?',
        [req.file.path, req.params.id]
      );

      // Notify via WebSocket
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({
            event: 'avatar_updated',
            data: {
              chatId: req.params.id,
              avatarUrl: req.file.path
            }
          }));
        }
      });

      res.status(200).json({ 
        avatarUrl: req.file.path
      });
    } catch (error) {
      console.error('Chat avatar upload error:', error);
      await fs.unlink(req.file.path);
      res.status(500).json({ error: 'Server error' });
    }
  });
});

export default router;
