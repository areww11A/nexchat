"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = exports.query = void 0;
const pg_1 = require("pg");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const pool = new pg_1.Pool({
    host: config_1.config.db.host,
    port: config_1.config.db.port,
    database: config_1.config.db.name,
    user: config_1.config.db.user,
    password: config_1.config.db.password,
});
const query = async (text, params) => {
    try {
        const result = await pool.query(text, params);
        return result;
    }
    catch (error) {
        logger_1.logger.error('Database error:', error);
        throw new Error('Database error');
    }
};
exports.query = query;
const initDatabase = async () => {
    try {
        // Создаем таблицы
        await (0, exports.query)(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL CHECK (type IN ('personal', 'group')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_members (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chat_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        is_edited BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP WITH TIME ZONE,
        reply_to_message_id INTEGER REFERENCES messages(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS blocked_users (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        blocked_by_user_id INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chat_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
      CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_blocked_users_chat_id ON blocked_users(chat_id);
      CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users(user_id);
    `);
        logger_1.logger.info('Database initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Error initializing database:', error);
        throw error;
    }
};
exports.initDatabase = initDatabase;
