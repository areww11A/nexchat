import express from 'express';
import multer from 'multer';
import { db, wss } from '../server.js';
import fs from 'fs/promises';
import path from 'path';
import { authenticate } from '../utils/auth.js';

const router = express.Router();
const uploadsDir = path.join(process.cwd(), 'uploads');

// Configure file upload
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
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/plain', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// File upload endpoint
router.post('/:chatId/file', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await db.run(
      'INSERT INTO messages (chatId, senderId, content, encryptedContent, fileUrl) VALUES (?, ?, ?, ?, ?)',
      [req.params.chatId, req.userId, req.file.originalname, '', req.file.path]
    );

    res.status(201).json({ 
      messageId: result.lastID,
      fileUrl: req.file.path
    });
  } catch (error) {
    console.error('File upload error:', error);
    if (req.file) await fs.unlink(req.file.path);
    res.status(500).json({ error: 'Server error' });
  }
});

// File download endpoint
router.get('/download/:messageId', authenticate, async (req, res) => {
  try {
    const message = await db.get(
      'SELECT * FROM messages WHERE id = ?',
      [req.params.messageId]
    );

    if (!message?.fileUrl) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!await fs.stat(message.fileUrl).catch(() => false)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(message.fileUrl, message.content);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sticker download endpoint
router.get('/sticker/:stickerId', authenticate, async (req, res) => {
  try {
    const sticker = await db.get(
      'SELECT * FROM stickers WHERE id = ?',
      [req.params.stickerId]
    );

    if (!sticker?.path) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    if (!await fs.stat(sticker.path).catch(() => false)) {
      return res.status(404).json({ error: 'Sticker file not found' });
    }

    res.download(sticker.path, `sticker-${sticker.id}${path.extname(sticker.path)}`);
  } catch (error) {
    console.error('Sticker download error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
