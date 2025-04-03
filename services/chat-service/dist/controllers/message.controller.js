"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageController = void 0;
const message_model_1 = require("../models/message.model");
const chat_model_1 = require("../models/chat.model");
const logger_1 = require("../utils/logger");
class MessageController {
    static async sendMessage(req, res) {
        try {
            const { chatId } = req.params;
            const { userId } = req.user;
            const { content, replyToMessageId } = req.body;
            if (!content) {
                return res.status(400).json({ error: 'Message content is required' });
            }
            const chat = await chat_model_1.ChatModel.getChatById(parseInt(chatId));
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }
            const isMember = await chat_model_1.ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
            if (!isMember) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const isBlocked = await chat_model_1.ChatModel.isUserBlocked(parseInt(chatId), userId);
            if (isBlocked) {
                return res.status(403).json({ error: 'You are blocked in this chat' });
            }
            const message = await message_model_1.MessageModel.createMessage(parseInt(chatId), userId, content, replyToMessageId);
            res.status(201).json(message);
        }
        catch (error) {
            logger_1.logger.error('Error sending message:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async getMessages(req, res) {
        try {
            const { chatId } = req.params;
            const { userId } = req.user;
            const { limit, offset } = req.query;
            const chat = await chat_model_1.ChatModel.getChatById(parseInt(chatId));
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }
            const isMember = await chat_model_1.ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
            if (!isMember) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const messages = await message_model_1.MessageModel.getMessages(parseInt(chatId), parseInt(limit) || 50, parseInt(offset) || 0);
            res.json(messages);
        }
        catch (error) {
            logger_1.logger.error('Error getting messages:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async editMessage(req, res) {
        try {
            const { messageId } = req.params;
            const { userId } = req.user;
            const { content } = req.body;
            if (!content) {
                return res.status(400).json({ error: 'Message content is required' });
            }
            const message = await message_model_1.MessageModel.getMessageById(parseInt(messageId));
            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }
            const isMember = await chat_model_1.ChatModel.isUserMemberOfChat(message.chatId, userId);
            if (!isMember) {
                return res.status(403).json({ error: 'Access denied' });
            }
            if (message.userId !== userId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const updatedMessage = await message_model_1.MessageModel.editMessage(parseInt(messageId), content);
            if (!updatedMessage) {
                return res.status(400).json({ error: 'Message cannot be edited after 24 hours' });
            }
            res.json(updatedMessage);
        }
        catch (error) {
            logger_1.logger.error('Error editing message:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async deleteMessage(req, res) {
        try {
            const { messageId } = req.params;
            const { userId } = req.user;
            const message = await message_model_1.MessageModel.getMessageById(parseInt(messageId));
            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }
            const isMember = await chat_model_1.ChatModel.isUserMemberOfChat(message.chatId, userId);
            if (!isMember) {
                return res.status(403).json({ error: 'Access denied' });
            }
            if (message.userId !== userId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const deleted = await message_model_1.MessageModel.deleteMessage(parseInt(messageId));
            if (!deleted) {
                return res.status(400).json({ error: 'Failed to delete message' });
            }
            res.status(200).json({ message: 'Message deleted successfully' });
        }
        catch (error) {
            logger_1.logger.error('Error deleting message:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async markMessageAsRead(req, res) {
        try {
            const { messageId } = req.params;
            const { userId } = req.user;
            const message = await message_model_1.MessageModel.getMessageById(parseInt(messageId));
            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }
            const marked = await message_model_1.MessageModel.markMessageAsRead(parseInt(messageId), userId);
            if (!marked) {
                return res.status(400).json({ error: 'Failed to mark message as read' });
            }
            res.status(200).json({ message: 'Message marked as read' });
        }
        catch (error) {
            logger_1.logger.error('Error marking message as read:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async deleteChatMessages(req, res) {
        try {
            const { chatId } = req.params;
            const { userId } = req.user;
            const chat = await chat_model_1.ChatModel.getChatById(parseInt(chatId));
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }
            const isMember = await chat_model_1.ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
            if (!isMember) {
                return res.status(403).json({ error: 'Access denied' });
            }
            await message_model_1.MessageModel.deleteChatMessages(parseInt(chatId), userId);
            res.status(200).json({ message: 'Chat messages deleted successfully' });
        }
        catch (error) {
            logger_1.logger.error('Error deleting chat messages:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async deleteSelectedMessages(req, res) {
        try {
            const { chatId } = req.params;
            const { userId } = req.user;
            const { messageIds } = req.body;
            if (!messageIds || !Array.isArray(messageIds)) {
                return res.status(400).json({ error: 'Message IDs array is required' });
            }
            const chat = await chat_model_1.ChatModel.getChatById(parseInt(chatId));
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }
            const isMember = await chat_model_1.ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
            if (!isMember) {
                return res.status(403).json({ error: 'Access denied' });
            }
            await message_model_1.MessageModel.deleteSelectedMessages(messageIds, userId);
            res.status(200).json({ message: 'Selected messages deleted successfully' });
        }
        catch (error) {
            logger_1.logger.error('Error deleting selected messages:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async deleteMessagesByDate(req, res) {
        try {
            const { chatId } = req.params;
            const { userId } = req.user;
            const { startDate, endDate } = req.body;
            if (!startDate || !endDate) {
                return res.status(400).json({ error: 'Start and end dates are required' });
            }
            const chat = await chat_model_1.ChatModel.getChatById(parseInt(chatId));
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }
            const members = await chat_model_1.ChatModel.getChatMembers(parseInt(chatId));
            const isAdmin = members.find(m => m.userId === userId)?.isAdmin;
            if (!isAdmin) {
                return res.status(403).json({ error: 'Access denied' });
            }
            await message_model_1.MessageModel.deleteMessagesByDate(parseInt(chatId), new Date(startDate), new Date(endDate));
            res.status(200).json({ message: 'Messages deleted successfully' });
        }
        catch (error) {
            logger_1.logger.error('Error deleting messages by date:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async pinMessage(req, res) {
        try {
            const { messageId } = req.params;
            const { userId } = req.user;
            const message = await message_model_1.MessageModel.getMessageById(parseInt(messageId));
            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }
            const members = await chat_model_1.ChatModel.getChatMembers(message.chatId);
            const isAdmin = members.find(m => m.userId === userId)?.isAdmin;
            if (!isAdmin) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const pinnedMessage = await message_model_1.MessageModel.pinMessage(parseInt(messageId));
            if (!pinnedMessage) {
                return res.status(400).json({ error: 'Failed to pin message' });
            }
            res.json(pinnedMessage);
        }
        catch (error) {
            logger_1.logger.error('Error pinning message:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async unpinMessage(req, res) {
        try {
            const { messageId } = req.params;
            const { userId } = req.user;
            const message = await message_model_1.MessageModel.getMessageById(parseInt(messageId));
            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }
            const members = await chat_model_1.ChatModel.getChatMembers(message.chatId);
            const isAdmin = members.find(m => m.userId === userId)?.isAdmin;
            if (!isAdmin) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const unpinnedMessage = await message_model_1.MessageModel.unpinMessage(parseInt(messageId));
            if (!unpinnedMessage) {
                return res.status(400).json({ error: 'Failed to unpin message' });
            }
            res.json(unpinnedMessage);
        }
        catch (error) {
            logger_1.logger.error('Error unpinning message:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async getPinnedMessages(req, res) {
        try {
            const { chatId } = req.params;
            const { userId } = req.user;
            const chat = await chat_model_1.ChatModel.getChatById(parseInt(chatId));
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }
            const isMember = await chat_model_1.ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
            if (!isMember) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const pinnedMessages = await message_model_1.MessageModel.getPinnedMessages(parseInt(chatId));
            res.json(pinnedMessages);
        }
        catch (error) {
            logger_1.logger.error('Error getting pinned messages:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async forwardMessage(req, res) {
        try {
            const { chatId } = req.params;
            const { userId } = req.user;
            const { messageId, targetChatId } = req.body;
            if (!messageId || !targetChatId) {
                return res.status(400).json({ error: 'Message ID and target chat ID are required' });
            }
            const sourceChat = await chat_model_1.ChatModel.getChatById(parseInt(chatId));
            const targetChat = await chat_model_1.ChatModel.getChatById(parseInt(targetChatId));
            if (!sourceChat || !targetChat) {
                return res.status(404).json({ error: 'Chat not found' });
            }
            const isSourceMember = await chat_model_1.ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
            const isTargetMember = await chat_model_1.ChatModel.isUserMemberOfChat(parseInt(targetChatId), userId);
            if (!isSourceMember || !isTargetMember) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const message = await message_model_1.MessageModel.forwardMessage(parseInt(messageId), parseInt(chatId), parseInt(targetChatId), userId);
            // Notify both source and target chats
            req.wsManager.notifyMessageForwarded(parseInt(targetChatId), message.id, parseInt(chatId), userId);
            res.status(201).json(message);
        }
        catch (error) {
            logger_1.logger.error('Error forwarding message:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async addReaction(req, res) {
        try {
            const { messageId } = req.params;
            const { userId } = req.user;
            const { emoji } = req.body;
            if (!emoji || emoji.length > 10) {
                return res.status(400).json({ error: 'Emoji is required and must be <= 10 chars' });
            }
            const message = await message_model_1.MessageModel.getMessageById(parseInt(messageId));
            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }
            const isMember = await chat_model_1.ChatModel.isUserMemberOfChat(message.chatId, userId);
            if (!isMember) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const reaction = await message_model_1.MessageModel.addReaction(parseInt(messageId), userId, emoji);
            // Notify chat about new reaction
            req.wsManager.notifyReactionAdded(message.chatId, parseInt(messageId), userId, emoji);
            res.status(201).json(reaction);
        }
        catch (error) {
            logger_1.logger.error('Error adding reaction:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async removeReaction(req, res) {
        try {
            const { messageId } = req.params;
            const { userId } = req.user;
            const { emoji } = req.body;
            if (!emoji) {
                return res.status(400).json({ error: 'Emoji is required' });
            }
            const message = await message_model_1.MessageModel.getMessageById(parseInt(messageId));
            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }
            const isMember = await chat_model_1.ChatModel.isUserMemberOfChat(message.chatId, userId);
            if (!isMember) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const removed = await message_model_1.MessageModel.removeReaction(parseInt(messageId), userId, emoji);
            if (!removed) {
                return res.status(404).json({ error: 'Reaction not found' });
            }
            // Notify chat about removed reaction
            req.wsManager.notifyReactionRemoved(message.chatId, parseInt(messageId), userId, emoji);
            res.status(200).json({ message: 'Reaction removed' });
        }
        catch (error) {
            logger_1.logger.error('Error removing reaction:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.MessageController = MessageController;
