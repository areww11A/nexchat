const Chat = require('../models/chat');
const { pool } = require('../config/db');

class ChatController {
  static async createPersonalChat(req, res) {
    try {
      const { userId } = req.body;
      const creatorId = req.user.id;
      
      const chatId = await Chat.createPersonalChat(creatorId, userId);
      res.status(201).json({ chatId });
    } catch (error) {
      console.error('Create personal chat error:', error);
      res.status(500).json({ error: 'Failed to create personal chat' });
    }
  }

  static async createGroupChat(req, res) {
    try {
      const { name, members } = req.body;
      const creatorId = req.user.id;
      
      const chatId = await Chat.createGroupChat(name, creatorId, members);
      res.status(201).json({ chatId });
    } catch (error) {
      console.error('Create group chat error:', error);
      res.status(500).json({ error: 'Failed to create group chat' });
    }
  }

  static async sendMessage(req, res) {
    try {
      const { chatId, content, replyToMessageId } = req.body;
      const userId = req.user.id;
      
      const message = await Chat.sendMessage(chatId, userId, content, replyToMessageId);
      res.status(201).json(message);
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  static async blockUser(req, res) {
    try {
      const { chatId, userId } = req.body;
      const blockedByUserId = req.user.id;
      
      await Chat.blockUser(chatId, userId, blockedByUserId);
      res.status(200).json({ message: 'User blocked successfully' });
    } catch (error) {
      console.error('Block user error:', error);
      res.status(500).json({ error: 'Failed to block user' });
    }
  }

  static async getChats(req, res) {
    try {
      const userId = req.user.id;
      const result = await pool.query(
        `SELECT c.id, c.is_group, c.name 
         FROM chats c
         JOIN chat_members cm ON c.id = cm.chat_id
         WHERE cm.user_id = $1`,
        [userId]
      );
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Get chats error:', error);
      res.status(500).json({ error: 'Failed to get chats' });
    }
  }

  static async getMessages(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;
      
      // Verify user is member of chat
      const memberCheck = await pool.query(
        'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
        [chatId, userId]
      );
      
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const result = await pool.query(
        `SELECT m.id, m.user_id, m.content, m.created_at, 
                m.is_edited, m.is_deleted, m.reply_to_message_id
         FROM messages m
         WHERE m.chat_id = $1 AND m.is_deleted = false
         ORDER BY m.created_at DESC
         LIMIT 50`,
        [chatId]
      );
      
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }
}

module.exports = ChatController;
