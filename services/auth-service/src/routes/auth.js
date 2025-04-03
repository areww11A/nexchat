const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth');
const { pool } = require('../config/db');

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'OK' });
  } catch (err) {
    res.status(500).json({ status: 'DB connection failed' });
  }
});
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/recover', AuthController.recoverPassword);
router.post('/reset', AuthController.resetPassword);

// Protected routes
router.get('/user/:id', authMiddleware, AuthController.getProfile);
router.patch('/profile', authMiddleware, AuthController.updateProfile);
router.patch('/password', authMiddleware, AuthController.changePassword);

// Temporary avatar endpoint (will be moved to MediaService)
router.post('/avatar', authMiddleware, (req, res) => {
  res.status(200).json({ 
    message: 'Avatar upload will be handled by MediaService',
    avatarUrl: '/default-avatar.png' 
  });
});

module.exports = router;
