import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { MessageController } from '../controllers/message.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Chat routes
router.post('/personal', authMiddleware, ChatController.createPersonalChat);
router.post('/group', authMiddleware, ChatController.createGroupChat);
router.get('/:chatId', authMiddleware, ChatController.getChat);
router.post('/:chatId/block', authMiddleware, ChatController.blockUser);
router.delete('/:chatId/block/:userId', authMiddleware, ChatController.unblockUser);
router.get('/:chatId/blocked', authMiddleware, ChatController.getBlockedUsers);

// Message routes
router.post('/:chatId/message', authMiddleware, MessageController.sendMessage);
router.get('/:chatId/messages', authMiddleware, MessageController.getMessages);
router.patch('/message/:messageId', authMiddleware, MessageController.editMessage);
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