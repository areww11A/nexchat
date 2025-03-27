import express from 'express';
import multer from 'multer';
import { db, wss } from '../server.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const uploadsDir = path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      console.log('Upload directory ready:', uploadsDir);
      cb(null, uploadsDir);
    } catch (err) {
      console.error('Error creating upload directory:', err);
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['text/plain', 'image/jpeg', 'image/png'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Error handling middleware
const handleUploadErrors = (err, req, res, next) => {
  if (err) {
    if (err.message === 'Invalid file type') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'File upload failed' });
  }
  next();
};

router.post('/:chatId/file', 
  upload.single('file'),
  handleUploadErrors,
  async (req, res) => {
    try {
      console.log('Incoming file upload:', {
        file: req.file,
        body: req.body,
        params: req.params
      });

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { chatId } = req.params;
      const { senderId } = req.body;

      const member = await db.get(
        'SELECT * FROM chat_members WHERE chatId = ? AND userId = ?',
        [chatId, senderId]
      );
      
      if (!member) {
        await fs.unlink(req.file.path);
        return res.status(403).json({ error: 'Access denied' });
      }

      const result = await db.run(
        'INSERT INTO messages (chatId, senderId, content, encryptedContent, fileUrl) VALUES (?, ?, ?, ?, ?)',
        [chatId, senderId, req.file.originalname, '', req.file.path]
      );

      res.status(201).json({ 
        messageId: result.lastID,
        fileUrl: req.file.path
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET endpoint for file info
router.get('/file/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await db.get(
      'SELECT * FROM messages WHERE id = ?',
      [messageId]
    );

    if (!message || !message.fileUrl) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.status(200).json({
      fileUrl: message.fileUrl,
      fileName: message.content
    });
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
