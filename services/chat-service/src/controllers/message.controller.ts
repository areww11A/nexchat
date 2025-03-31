import { Request, Response } from 'express';
import { MessageModel } from '../models/message.model';
import { ChatModel } from '../models/chat.model';
import { logger } from '../utils/logger';

export class MessageController {
  static async sendMessage(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;
      const { content, replyToMessageId } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      const chat = await ChatModel.getChatById(parseInt(chatId));
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      const isMember = await ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const isBlocked = await ChatModel.isUserBlocked(parseInt(chatId), userId);
      if (isBlocked) {
        return res.status(403).json({ error: 'You are blocked in this chat' });
      }

      const message = await MessageModel.createMessage(
        parseInt(chatId),
        userId,
        content,
        replyToMessageId
      );

      res.status(201).json(message);
    } catch (error) {
      logger.error('Error sending message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getMessages(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;
      const { limit, offset } = req.query;

      const chat = await ChatModel.getChatById(parseInt(chatId));
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      const isMember = await ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const messages = await MessageModel.getMessages(
        parseInt(chatId),
        parseInt(limit as string) || 50,
        parseInt(offset as string) || 0
      );

      res.json(messages);
    } catch (error) {
      logger.error('Error getting messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async editMessage(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const { userId } = req.user;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      const message = await MessageModel.getMessageById(parseInt(messageId));
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const isMember = await ChatModel.isUserMemberOfChat(message.chatId, userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (message.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updatedMessage = await MessageModel.editMessage(parseInt(messageId), content);
      if (!updatedMessage) {
        return res.status(400).json({ error: 'Message cannot be edited after 24 hours' });
      }

      res.json(updatedMessage);
    } catch (error) {
      logger.error('Error editing message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteMessage(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const { userId } = req.user;

      const message = await MessageModel.getMessageById(parseInt(messageId));
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const isMember = await ChatModel.isUserMemberOfChat(message.chatId, userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (message.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const deleted = await MessageModel.deleteMessage(parseInt(messageId));
      if (!deleted) {
        return res.status(400).json({ error: 'Failed to delete message' });
      }

      res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
      logger.error('Error deleting message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async markMessageAsRead(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const { userId } = req.user;

      const message = await MessageModel.getMessageById(parseInt(messageId));
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const marked = await MessageModel.markMessageAsRead(parseInt(messageId), userId);
      if (!marked) {
        return res.status(400).json({ error: 'Failed to mark message as read' });
      }

      res.status(200).json({ message: 'Message marked as read' });
    } catch (error) {
      logger.error('Error marking message as read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteChatMessages(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;

      const chat = await ChatModel.getChatById(parseInt(chatId));
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      const isMember = await ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await MessageModel.deleteChatMessages(parseInt(chatId), userId);
      res.status(200).json({ message: 'Chat messages deleted successfully' });
    } catch (error) {
      logger.error('Error deleting chat messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteSelectedMessages(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;
      const { messageIds } = req.body;

      if (!messageIds || !Array.isArray(messageIds)) {
        return res.status(400).json({ error: 'Message IDs array is required' });
      }

      const chat = await ChatModel.getChatById(parseInt(chatId));
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      const isMember = await ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await MessageModel.deleteSelectedMessages(messageIds, userId);
      res.status(200).json({ message: 'Selected messages deleted successfully' });
    } catch (error) {
      logger.error('Error deleting selected messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteMessagesByDate(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start and end dates are required' });
      }

      const chat = await ChatModel.getChatById(parseInt(chatId));
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      const members = await ChatModel.getChatMembers(parseInt(chatId));
      const isAdmin = members.find(m => m.userId === userId)?.isAdmin;

      if (!isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await MessageModel.deleteMessagesByDate(
        parseInt(chatId),
        new Date(startDate),
        new Date(endDate)
      );

      res.status(200).json({ message: 'Messages deleted successfully' });
    } catch (error) {
      logger.error('Error deleting messages by date:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async pinMessage(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const { userId } = req.user;

      const message = await MessageModel.getMessageById(parseInt(messageId));
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const members = await ChatModel.getChatMembers(message.chatId);
      const isAdmin = members.find(m => m.userId === userId)?.isAdmin;

      if (!isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const pinnedMessage = await MessageModel.pinMessage(parseInt(messageId));
      if (!pinnedMessage) {
        return res.status(400).json({ error: 'Failed to pin message' });
      }

      res.json(pinnedMessage);
    } catch (error) {
      logger.error('Error pinning message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async unpinMessage(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const { userId } = req.user;

      const message = await MessageModel.getMessageById(parseInt(messageId));
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const members = await ChatModel.getChatMembers(message.chatId);
      const isAdmin = members.find(m => m.userId === userId)?.isAdmin;

      if (!isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const unpinnedMessage = await MessageModel.unpinMessage(parseInt(messageId));
      if (!unpinnedMessage) {
        return res.status(400).json({ error: 'Failed to unpin message' });
      }

      res.json(unpinnedMessage);
    } catch (error) {
      logger.error('Error unpinning message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getPinnedMessages(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;

      const chat = await ChatModel.getChatById(parseInt(chatId));
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      const isMember = await ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const pinnedMessages = await MessageModel.getPinnedMessages(parseInt(chatId));
      res.json(pinnedMessages);
    } catch (error) {
      logger.error('Error getting pinned messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
} 