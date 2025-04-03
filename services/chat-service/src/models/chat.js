const { pool } = require('../config/db');

class Chat {
  static async createTables() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS chat_members (
        chat_id INTEGER REFERENCES chats(id),
        user_id INTEGER,
        is_admin BOOLEAN DEFAULT false,
        PRIMARY KEY (chat_id, user_id)
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES chats(id),
        user_id INTEGER,
        content TEXT,
        is_edited BOOLEAN DEFAULT false,
        is_deleted BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        reply_to_message_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS blocked_users (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER,
        user_id INTEGER,
        blocked_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS reactions (
        id SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES messages(id),
        user_id INTEGER,
        emoji VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  static async createPersonalChat(userId1, userId2) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create chat
    const chatRes = await client.query(
      'INSERT INTO chats DEFAULT VALUES RETURNING id'
    );
      const chatId = chatRes.rows[0].id;
      
      // Add members
      await client.query(
        'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)',
        [chatId, userId1, userId2]
      );
      
      await client.query('COMMIT');
      return chatId;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async createGroupChat(name, creatorId, members) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create chat
      const chatRes = await client.query(
        'INSERT INTO chats (name) VALUES ($1) RETURNING id',
        [name]
      );
      const chatId = chatRes.rows[0].id;
      
      // Add creator as admin
      await client.query(
        'INSERT INTO chat_members (chat_id, user_id, is_admin) VALUES ($1, $2, true)',
        [chatId, creatorId]
      );
      
      // Add other members
      for (const memberId of members) {
        await client.query(
          'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2)',
          [chatId, memberId]
        );
      }
      
      await client.query('COMMIT');
      return chatId;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async sendMessage(chatId, userId, content, replyToMessageId = null) {
    const result = await pool.query(
      `INSERT INTO messages 
       (chat_id, user_id, content, reply_to_message_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [chatId, userId, content, replyToMessageId]
    );
    return result.rows[0];
  }

  static async blockUser(chatId, userId, blockedByUserId) {
    await pool.query(
      'INSERT INTO blocked_users (chat_id, user_id, blocked_by_user_id) VALUES ($1, $2, $3)',
      [chatId, userId, blockedByUserId]
    );
  }
}

module.exports = Chat;
