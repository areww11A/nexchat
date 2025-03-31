"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const chat_model_1 = require("../models/chat.model");
const logger_1 = require("../utils/logger");
class ChatController {
    static async createPersonalChat(req, res) {
        try {
            const { userId } = req.user;
            const { targetUserId } = req.body;
            if (!targetUserId) {
                return res.status(400).json({ error: 'Target user ID is required' });
            }
            const chat = await chat_model_1.ChatModel.createPersonalChat(userId, targetUserId);
            res.status(201).json(chat);
        }
        catch (error) {
            logger_1.logger.error('Error creating personal chat:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async createGroupChat(req, res) {
        try {
            const { userId } = req.user;
            const { memberIds } = req.body;
            if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
                return res.status(400).json({ error: 'At least 2 members are required' });
            }
            const chat = await chat_model_1.ChatModel.createGroupChat(userId, memberIds);
            res.status(201).json(chat);
        }
        catch (error) {
            logger_1.logger.error('Error creating group chat:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async getChat(req, res) {
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
            const members = await chat_model_1.ChatModel.getChatMembers(parseInt(chatId));
            res.json({ ...chat, members });
        }
        catch (error) {
            logger_1.logger.error('Error getting chat:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async blockUser(req, res) {
        try {
            const { chatId } = req.params;
            const { userId } = req.user;
            const { targetUserId } = req.body;
            if (!targetUserId) {
                return res.status(400).json({ error: 'Target user ID is required' });
            }
            const chat = await chat_model_1.ChatModel.getChatById(parseInt(chatId));
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }
            if (chat.type !== 'personal') {
                return res.status(400).json({ error: 'Can only block users in personal chats' });
            }
            await chat_model_1.ChatModel.blockUser(parseInt(chatId), targetUserId, userId);
            res.status(200).json({ message: 'User blocked successfully' });
        }
        catch (error) {
            logger_1.logger.error('Error blocking user:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async unblockUser(req, res) {
        try {
            const { chatId, userId } = req.params;
            const { userId: currentUserId } = req.user;
            const chat = await chat_model_1.ChatModel.getChatById(parseInt(chatId));
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }
            if (chat.type !== 'personal') {
                return res.status(400).json({ error: 'Can only unblock users in personal chats' });
            }
            await chat_model_1.ChatModel.unblockUser(parseInt(chatId), parseInt(userId));
            res.status(200).json({ message: 'User unblocked successfully' });
        }
        catch (error) {
            logger_1.logger.error('Error unblocking user:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async getBlockedUsers(req, res) {
        try {
            const { chatId } = req.params;
            const { userId } = req.user;
            const chat = await chat_model_1.ChatModel.getChatById(parseInt(chatId));
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }
            if (chat.type !== 'personal') {
                return res.status(400).json({ error: 'Can only get blocked users in personal chats' });
            }
            const isMember = await chat_model_1.ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
            if (!isMember) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const blockedUsers = await chat_model_1.ChatModel.getBlockedUsers(parseInt(chatId));
            res.json(blockedUsers);
        }
        catch (error) {
            logger_1.logger.error('Error getting blocked users:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.ChatController = ChatController;
