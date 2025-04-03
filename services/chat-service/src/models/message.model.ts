import { query } from '../db';
import { Message } from './chat.model';

export class MessageModel {
  static async createMessage(chatId: number, userId: number, content: string, replyToMessageId?: number): Promise<Message> {
    const result = await query(
      `INSERT INTO messages (chat_id, user_id, content, reply_to_message_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [chatId, userId, content, replyToMessageId || null]
    );
    return result.rows[0];
  }

  static async getMessages(chatId: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const result = await query(
      `SELECT * FROM messages
       WHERE chat_id = $1 AND is_deleted = false
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [chatId, limit, offset]
    );
    return result.rows;
  }

  static async getMessageById(messageId: number): Promise<Message | null> {
    const result = await query(
      `SELECT id, chat_id as "chatId", user_id as "userId", 
              content, is_edited as "isEdited", is_deleted as "isDeleted",
              read_at as "readAt", reply_to_message_id as "replyToMessageId",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM messages 
       WHERE id = $1`,
      [messageId]
    );
    return result.rows[0] || null;
  }

  static async editMessage(messageId: number, content: string): Promise<Message | null> {
    const result = await query(
      `UPDATE messages
       SET content = $1, is_edited = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [content, messageId]
    );
    return result.rows[0] || null;
  }

  static async deleteMessage(messageId: number): Promise<boolean> {
    const result = await query(
      `UPDATE messages
       SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [messageId]
    );
    return result.rows.length > 0;
  }

  static async markMessageAsRead(messageId: number, userId: number): Promise<boolean> {
    const result = await query(
      `UPDATE messages
       SET read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id != $2
       RETURNING id`,
      [messageId, userId]
    );
    return result.rows.length > 0;
  }

  static async deleteChatMessages(chatId: number, userId: number): Promise<void> {
    await query(
      `UPDATE messages
       SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE chat_id = $1 AND user_id = $2`,
      [chatId, userId]
    );
  }

  static async deleteSelectedMessages(messageIds: number[], userId: number): Promise<void> {
    await query(
      `UPDATE messages
       SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($1) AND user_id = $2`,
      [messageIds, userId]
    );
  }

  static async deleteMessagesByDate(chatId: number, startDate: Date, endDate: Date): Promise<void> {
    await query(
      `UPDATE messages
       SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE chat_id = $1 AND created_at BETWEEN $2 AND $3`,
      [chatId, startDate, endDate]
    );
  }

  static async pinMessage(messageId: number): Promise<Message | null> {
    const result = await query(
      `UPDATE messages
       SET is_pinned = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [messageId]
    );
    return result.rows[0] || null;
  }

  static async unpinMessage(messageId: number): Promise<Message | null> {
    const result = await query(
      `UPDATE messages
       SET is_pinned = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [messageId]
    );
    return result.rows[0] || null;
  }

  static async getPinnedMessages(chatId: number): Promise<Message[]> {
    const result = await query(
      `SELECT * FROM messages
       WHERE chat_id = $1 AND is_pinned = true AND is_deleted = false
       ORDER BY created_at DESC`,
      [chatId]
    );
    return result.rows;
  }

  static async forwardMessage(messageId: number, sourceChatId: number, targetChatId: number, userId: number): Promise<Message> {
    const message = await this.getMessageById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const result = await query(
      `INSERT INTO messages (chat_id, user_id, content, is_forwarded, original_chat_id, original_message_id)
       VALUES ($1, $2, $3, true, $4, $5)
       RETURNING *`,
      [targetChatId, userId, message.content, sourceChatId, messageId]
    );
    return result.rows[0];
  }

  static async addReaction(messageId: number, userId: number, emoji: string): Promise<Reaction> {
    const result = await query(
      `INSERT INTO reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, emoji) DO NOTHING
       RETURNING *`,
      [messageId, userId, emoji]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Reaction already exists');
    }
    return result.rows[0];
  }

  static async removeReaction(messageId: number, userId: number, emoji: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM reactions
       WHERE message_id = $1 AND user_id = $2 AND emoji = $3
       RETURNING id`,
      [messageId, userId, emoji]
    );
    return result.rows.length > 0;
  }
}

interface Reaction {
  id: number;
  message_id: number;
  user_id: number;
  emoji: string;
  created_at: Date;
}
