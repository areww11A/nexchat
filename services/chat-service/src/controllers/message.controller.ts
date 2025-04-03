import { Request, Response } from 'express';
import { MessageModel } from '../models/message.model';
import { ChatModel } from '../models/chat.model';
import { logger } from '../utils/logger';

class MessageControllerImpl {
  static async editMessage(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const { userId } = req.user;
      const { content } = req.body;

      // Валидация ввода
      if (!content || content.trim().length === 0) {
        logger.warn('Попытка редактирования с пустым текстом');
        return res.status(400).json({ error: 'Текст сообщения обязателен' });
      }

      // Получаем сообщение
      const message = await MessageModel.getMessageById(parseInt(messageId));
      if (!message) {
        logger.warn(`Сообщение ${messageId} не найдено`);
        return res.status(404).json({ error: 'Сообщение не найдено' });
      }

      // Проверяем права
      if (message.userId !== userId) {
        logger.warn(`Попытка редактирования чужого сообщения. Пользователь: ${userId}, автор: ${message.userId}`);
        return res.status(403).json({ error: 'Нет прав на редактирование' });
      }

      // Проверяем временное ограничение (24 часа)
      const now = new Date();
      const messageDate = new Date(message.createdAt);
      const hoursDiff = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        logger.warn(`Попытка редактирования старого сообщения. Прошло часов: ${hoursDiff}`);
        return res.status(400).json({ error: 'Можно редактировать только сообщения младше 24 часов' });
      }

      // Обновляем сообщение
      const updatedMessage = await MessageModel.editMessage(parseInt(messageId), content);
      logger.info(`Сообщение ${messageId} успешно отредактировано`);

      return res.json(updatedMessage);
    } catch (error) {
      logger.error('Ошибка при редактировании сообщения:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  static async sendMessage(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;
      const { content, replyToMessageId } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Текст сообщения обязателен' });
      }

      const message = await MessageModel.createMessage(
        parseInt(chatId),
        userId,
        content,
        replyToMessageId
      );
      return res.status(201).json(message);
    } catch (error) {
      logger.error('Ошибка при отправке сообщения:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }
  
  static async forwardMessage(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;
      const { messageId, targetChatId } = req.body;

      const message = await MessageModel.forwardMessage(
        parseInt(messageId),
        parseInt(chatId),
        parseInt(targetChatId),
        userId
      );
      return res.status(201).json(message);
    } catch (error) {
      logger.error('Ошибка при пересылке сообщения:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  static async getMessages(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;
      const { limit, offset } = req.query;

      const messages = await MessageModel.getMessages(
        parseInt(chatId),
        parseInt(limit as string) || 50,
        parseInt(offset as string) || 0
      );
      return res.json(messages);
    } catch (error) {
      logger.error('Ошибка при получении сообщений:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  static async addReaction(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const { userId } = req.user;
      const { emoji } = req.body;

      const reaction = await MessageModel.addReaction(
        parseInt(messageId),
        userId,
        emoji
      );
      return res.status(201).json(reaction);
    } catch (error) {
      logger.error('Ошибка при добавлении реакции:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  static async removeReaction(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const { userId } = req.user;
      const { emoji } = req.body;

      const removed = await MessageModel.removeReaction(
        parseInt(messageId),
        userId,
        emoji
      );
      return res.json({ success: removed });
    } catch (error) {
      logger.error('Ошибка при удалении реакции:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  static async deleteMessage(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const { userId } = req.user;

      const deleted = await MessageModel.deleteMessage(parseInt(messageId));
      return res.json({ success: deleted });
    } catch (error) {
      logger.error('Ошибка при удалении сообщения:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  static async markMessageAsRead(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const { userId } = req.user;

      const marked = await MessageModel.markMessageAsRead(parseInt(messageId), userId);
      return res.json({ success: marked });
    } catch (error) {
      logger.error('Ошибка при отметке сообщения как прочитанного:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  static async deleteChatMessages(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;

      await MessageModel.deleteChatMessages(parseInt(chatId), userId);
      return res.json({ success: true });
    } catch (error) {
      logger.error('Ошибка при удалении сообщений чата:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  static async deleteSelectedMessages(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;
      const { messageIds } = req.body;

      await MessageModel.deleteSelectedMessages(messageIds, userId);
      return res.json({ success: true });
    } catch (error) {
      logger.error('Ошибка при удалении выбранных сообщений:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  static async deleteMessagesByDate(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;
      const { startDate, endDate } = req.body;

      await MessageModel.deleteMessagesByDate(
        parseInt(chatId),
        new Date(startDate),
        new Date(endDate)
      );
      return res.json({ success: true });
    } catch (error) {
      logger.error('Ошибка при удалении сообщений по дате:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  static async pinMessage(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const { userId } = req.user;

      const message = await MessageModel.getMessageById(parseInt(messageId));
      if (!message) {
        return res.status(404).json({ error: 'Сообщение не найдено' });
      }

      const members = await ChatModel.getChatMembers(message.chatId);
      const isAdmin = members.find(m => m.userId === userId)?.isAdmin;

      if (!isAdmin) {
        return res.status(403).json({ error: 'Требуются права администратора' });
      }

      const pinnedMessage = await MessageModel.pinMessage(parseInt(messageId));
      return res.json(pinnedMessage);
    } catch (error) {
      logger.error('Ошибка при закреплении сообщения:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  static async unpinMessage(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const { userId } = req.user;

      const message = await MessageModel.getMessageById(parseInt(messageId));
      if (!message) {
        return res.status(404).json({ error: 'Сообщение не найдено' });
      }

      const members = await ChatModel.getChatMembers(message.chatId);
      const isAdmin = members.find(m => m.userId === userId)?.isAdmin;

      if (!isAdmin) {
        return res.status(403).json({ error: 'Требуются права администратора' });
      }

      const unpinnedMessage = await MessageModel.unpinMessage(parseInt(messageId));
      return res.json(unpinnedMessage);
    } catch (error) {
      logger.error('Ошибка при откреплении сообщения:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  static async getPinnedMessages(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user;

      const isMember = await ChatModel.isUserMemberOfChat(parseInt(chatId), userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }

      const pinnedMessages = await MessageModel.getPinnedMessages(parseInt(chatId));
      return res.json(pinnedMessages);
    } catch (error) {
      logger.error('Ошибка при получении закрепленных сообщений:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }
}

export const MessageController = {
  sendMessage: MessageControllerImpl.sendMessage,
  forwardMessage: MessageControllerImpl.forwardMessage,
  addReaction: MessageControllerImpl.addReaction,
  removeReaction: MessageControllerImpl.removeReaction,
  getMessages: MessageControllerImpl.getMessages,
  editMessage: MessageControllerImpl.editMessage,
  deleteMessage: MessageControllerImpl.deleteMessage,
  markMessageAsRead: MessageControllerImpl.markMessageAsRead,
  deleteChatMessages: MessageControllerImpl.deleteChatMessages,
  deleteSelectedMessages: MessageControllerImpl.deleteSelectedMessages,
  deleteMessagesByDate: MessageControllerImpl.deleteMessagesByDate,
  pinMessage: MessageControllerImpl.pinMessage,
  unpinMessage: MessageControllerImpl.unpinMessage,
  getPinnedMessages: MessageControllerImpl.getPinnedMessages
};
