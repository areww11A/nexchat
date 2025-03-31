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
      `SELECT * FROM messages WHERE id = $1`,
      [messageId]
    );
    return result.rows[0] || null;
  }

  static async editMessage(messageId: number, content: string): Promise<Message | null> {
    const result = await query(
      `UPDATE messages
       SET content = $1, is_edited = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND created_at > NOW() - INTERVAL '24 hours'
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
} 