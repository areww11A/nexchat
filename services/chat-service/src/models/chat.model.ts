import { query } from '../db';

export interface Chat {
  id: number;
  type: 'personal' | 'group';
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMember {
  id: number;
  chatId: number;
  userId: number;
  isAdmin: boolean;
  joinedAt: Date;
}

export interface Message {
  id: number;
  chatId: number;
  userId: number;
  content: string;
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  readAt: Date | null;
  replyToMessageId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlockedUser {
  id: number;
  chatId: number;
  userId: number;
  blockedByUserId: number;
  createdAt: Date;
}

export class ChatModel {
  static async createPersonalChat(userId1: number, userId2: number): Promise<Chat> {
    const result = await query(
      `INSERT INTO chats (type) VALUES ('personal') RETURNING *`
    );
    const chat = result.rows[0];

    await query(
      `INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)`,
      [chat.id, userId1, userId2]
    );

    return chat;
  }

  static async createGroupChat(userId: number, memberIds: number[]): Promise<Chat> {
    const result = await query(
      `INSERT INTO chats (type) VALUES ('group') RETURNING *`
    );
    const chat = result.rows[0];

    const values = memberIds.map(id => `(${chat.id}, ${id}, ${id === userId ? 'true' : 'false'})`).join(',');
    await query(
      `INSERT INTO chat_members (chat_id, user_id, is_admin) VALUES ${values}`
    );

    return chat;
  }

  static async getChatById(chatId: number): Promise<Chat | null> {
    const result = await query(
      `SELECT * FROM chats WHERE id = $1`,
      [chatId]
    );
    return result.rows[0] || null;
  }

  static async getChatMembers(chatId: number): Promise<ChatMember[]> {
    const result = await query(
      `SELECT * FROM chat_members WHERE chat_id = $1`,
      [chatId]
    );
    return result.rows;
  }

  static async isUserMemberOfChat(chatId: number, userId: number): Promise<boolean> {
    const result = await query(
      `SELECT EXISTS(SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2)`,
      [chatId, userId]
    );
    return result.rows[0].exists;
  }

  static async isUserBlocked(chatId: number, userId: number): Promise<boolean> {
    const result = await query(
      `SELECT EXISTS(SELECT 1 FROM blocked_users WHERE chat_id = $1 AND user_id = $2)`,
      [chatId, userId]
    );
    return result.rows[0].exists;
  }

  static async blockUser(chatId: number, userId: number, blockedByUserId: number): Promise<void> {
    await query(
      `INSERT INTO blocked_users (chat_id, user_id, blocked_by_user_id) VALUES ($1, $2, $3)`,
      [chatId, userId, blockedByUserId]
    );
  }

  static async unblockUser(chatId: number, userId: number): Promise<void> {
    await query(
      `DELETE FROM blocked_users WHERE chat_id = $1 AND user_id = $2`,
      [chatId, userId]
    );
  }

  static async getBlockedUsers(chatId: number): Promise<BlockedUser[]> {
    const result = await query(
      `SELECT * FROM blocked_users WHERE chat_id = $1`,
      [chatId]
    );
    return result.rows;
  }
} 