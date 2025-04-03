"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const message_controller_1 = require("../controllers/message.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Chat routes
router.post('/personal', auth_middleware_1.authMiddleware, chat_controller_1.ChatController.createPersonalChat);
router.post('/group', auth_middleware_1.authMiddleware, chat_controller_1.ChatController.createGroupChat);
router.get('/:chatId', auth_middleware_1.authMiddleware, chat_controller_1.ChatController.getChat);
router.post('/:chatId/block', auth_middleware_1.authMiddleware, chat_controller_1.ChatController.blockUser);
router.delete('/:chatId/block/:userId', auth_middleware_1.authMiddleware, chat_controller_1.ChatController.unblockUser);
router.get('/:chatId/blocked', auth_middleware_1.authMiddleware, chat_controller_1.ChatController.getBlockedUsers);
// Message routes
router.post('/:chatId/message', auth_middleware_1.authMiddleware, message_controller_1.MessageController.sendMessage);
router.post('/:chatId/forward', auth_middleware_1.authMiddleware, message_controller_1.MessageController.forwardMessage);
router.post('/message/:messageId/reaction', auth_middleware_1.authMiddleware, message_controller_1.MessageController.addReaction);
router.delete('/message/:messageId/reaction', auth_middleware_1.authMiddleware, message_controller_1.MessageController.removeReaction);
router.get('/:chatId/messages', auth_middleware_1.authMiddleware, message_controller_1.MessageController.getMessages);
router.patch('/message/:messageId', auth_middleware_1.authMiddleware, message_controller_1.MessageController.editMessage);
router.delete('/message/:messageId', auth_middleware_1.authMiddleware, message_controller_1.MessageController.deleteMessage);
router.post('/message/:messageId/read', auth_middleware_1.authMiddleware, message_controller_1.MessageController.markMessageAsRead);
router.delete('/:chatId/messages', auth_middleware_1.authMiddleware, message_controller_1.MessageController.deleteChatMessages);
router.delete('/:chatId/messages/selected', auth_middleware_1.authMiddleware, message_controller_1.MessageController.deleteSelectedMessages);
router.delete('/:chatId/messages/by-date', auth_middleware_1.authMiddleware, message_controller_1.MessageController.deleteMessagesByDate);
// Pinned messages routes
router.post('/message/:messageId/pin', auth_middleware_1.authMiddleware, message_controller_1.MessageController.pinMessage);
router.delete('/message/:messageId/pin', auth_middleware_1.authMiddleware, message_controller_1.MessageController.unpinMessage);
router.get('/:chatId/pinned', auth_middleware_1.authMiddleware, message_controller_1.MessageController.getPinnedMessages);
exports.default = router;
