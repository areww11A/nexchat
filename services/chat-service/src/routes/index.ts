import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { MessageController } from '../controllers/message.controller';
// import { authMiddleware } from '../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';
import '../types/express.d.ts';
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Добавляем тестового пользователя для проверки функционала
  req.user = { userId: 1 };
  next();
};
import testRoutes from './test';

const router = Router();

// Test routes (no auth required)
router.use('/test', testRoutes);

// Chat routes
router.post('/personal', authMiddleware, ChatController.createPersonalChat);
router.post('/group', authMiddleware, ChatController.createGroupChat);
router.get('/:chatId', authMiddleware, ChatController.getChat);
router.post('/:chatId/block', authMiddleware, ChatController.blockUser);
router.delete('/:chatId/block/:userId', authMiddleware, ChatController.unblockUser);
router.get('/:chatId/blocked', authMiddleware, ChatController.getBlockedUsers);

// Message routes
router.post('/:chatId/message', authMiddleware, MessageController.sendMessage);
router.post('/:chatId/forward', authMiddleware, MessageController.forwardMessage);
router.post('/message/:messageId/reaction', authMiddleware, MessageController.addReaction);
router.delete('/message/:messageId/reaction', authMiddleware, MessageController.removeReaction);
router.get('/:chatId/messages', authMiddleware, MessageController.getMessages);
router.patch('/message/:messageId', 
  (req, res, next) => {
    const logger = require('../utils/logger');
    logger.info(`PATCH request received for message ${req.params.messageId}`);
    logger.debug('Request headers:', req.headers);
    next();
  },
  authMiddleware, 
  MessageController.editMessage
);
router.delete('/message/:messageId', authMiddleware, MessageController.deleteMessage);
router.post('/message/:messageId/read', authMiddleware, MessageController.markMessageAsRead);
router.delete('/:chatId/messages', authMiddleware, MessageController.deleteChatMessages);
router.delete('/:chatId/messages/selected', authMiddleware, MessageController.deleteSelectedMessages);
router.delete('/:chatId/messages/by-date', authMiddleware, MessageController.deleteMessagesByDate);

// Pinned messages routes
router.post('/message/:messageId/pin', authMiddleware, MessageController.pinMessage);
router.delete('/message/:messageId/pin', authMiddleware, MessageController.unpinMessage);
router.get('/:chatId/pinned', authMiddleware, MessageController.getPinnedMessages);

export default router;
