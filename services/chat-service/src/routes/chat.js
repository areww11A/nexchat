const express = require('express');
const ChatController = require('../controllers/chat');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Chat routes
router.post('/personal', ChatController.createPersonalChat);
router.post('/group', ChatController.createGroupChat);
router.post('/:id/message', ChatController.sendMessage);
router.post('/:id/block', ChatController.blockUser);
router.get('/', ChatController.getChats);
router.get('/:id/messages', ChatController.getMessages);

module.exports = router;
