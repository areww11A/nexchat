import { Request, Response } from 'express';
import { ChatModel } from '../models/chat.model';
import { logger } from '../utils/logger';

export class ChatController {
  static async createPersonalChat(req: Request, res: Response) {
    try {
      const { userId } = req.user;
      const { targetUserId } = req.body;

      if (!targetUserId) {
        return res.status(400).json({ error: 'Target user ID is required' });
      }

      const chat = await ChatModel.createPersonalChat(userId, targetUserId);
      res.status(201).json(chat);
    } catch (error) {
      logger.error('Error creating personal chat:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createGroupChat(req: Request, res: Response) {
    try {
      const { userId } = req.user;
      const { memberIds } = req.body;

      if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
        return res.status(400).json({ error: 'At least 2 members are required' });
      }

      const chat = await ChatModel.createGroupChat(userId, memberIds);
      res.status(201).json(chat);
    } catch (error) {
      logger.error('Error creating group chat:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getChat(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;

      if (isNaN(parseInt(chatId))) {
        return res.status(400).json({ error: 'Invalid chat ID' });
      }

      const numericChatId = parseInt(chatId);
      logger.debug(`Getting chat with ID: ${numericChatId}`);
      
      const chat = await ChatModel.getChatById(numericChatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      const isMember = await ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const members = await ChatModel.getChatMembers(parseInt(chatId));
      res.json({ ...chat, members });
    } catch (error) {
      logger.error('Error getting chat:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async blockUser(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;
      const { targetUserId } = req.body;

      if (!targetUserId) {
        return res.status(400).json({ error: 'Target user ID is required' });
      }

      const chat = await ChatModel.getChatById(parseInt(chatId));
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (chat.type !== 'personal') {
        return res.status(400).json({ error: 'Can only block users in personal chats' });
      }

      await ChatModel.blockUser(parseInt(chatId), targetUserId, userId);
      res.status(200).json({ message: 'User blocked successfully' });
    } catch (error) {
      logger.error('Error blocking user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async unblockUser(req: Request, res: Response) {
    try {
      const { chatId, userId } = req.params;
      const { userId: currentUserId } = req.user;

      const chat = await ChatModel.getChatById(parseInt(chatId));
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (chat.type !== 'personal') {
        return res.status(400).json({ error: 'Can only unblock users in personal chats' });
      }

      await ChatModel.unblockUser(parseInt(chatId), parseInt(userId));
      res.status(200).json({ message: 'User unblocked successfully' });
    } catch (error) {
      logger.error('Error unblocking user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getBlockedUsers(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;

      const chat = await ChatModel.getChatById(parseInt(chatId));
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (chat.type !== 'personal') {
        return res.status(400).json({ error: 'Can only get blocked users in personal chats' });
      }

      const isMember = await ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const blockedUsers = await ChatModel.getBlockedUsers(parseInt(chatId));
      res.json(blockedUsers);
    } catch (error) {
      logger.error('Error getting blocked users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
