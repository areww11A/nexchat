import express from 'express';
import multer from 'multer';
import { db } from '../server.js';
import { authenticate } from '../utils/auth.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const uploadsDir = path.join(process.cwd(), 'uploads', 'stickers');

// Configure multer for sticker uploads
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
  limits: { fileSize: 512 * 1024 }, // 512KB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG and GIF are allowed'));
    }
  }
});

// Upload sticker
router.post('/', (req, res, next) => {
  console.log('Sticker upload headers:', req.headers);
  next();
}, authenticate, upload.single('sticker'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No sticker file provided' });
    }

    const { userId } = req;
    const stickerPath = req.file.path;

    // Save to database
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO stickers (userId, path) VALUES (?, ?)`,
        [userId, stickerPath],
        function(err) {
          if (err) return reject(err);
          resolve(this);
        }
      );
    });

    // Broadcast new sticker event via WebSocket
    req.wss.clients.forEach(client => {
      if (client.userId === userId) {
        client.send(JSON.stringify({
          event: 'sticker_added',
          data: { 
            stickerId: result.lastID, 
            path: stickerPath 
          }
        }));
      }
    });

    res.status(201).json({ 
      stickerId: result.lastID,
      path: stickerPath
    });
  } catch (err) {
    console.error('Sticker upload error:', err);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    
    if (err.message.includes('Invalid file type')) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get all stickers for user
router.get('/', authenticate, async (req, res) => {
  try {
    const stickers = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id as stickerId, path FROM stickers WHERE userId = ? ORDER BY createdAt DESC`,
        [req.userId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    res.status(200).json(stickers);
  } catch (err) {
    console.error('Get stickers error:', err);
    res.status(500).json({ error: 'Failed to fetch stickers' });
  }
});

export default router;
