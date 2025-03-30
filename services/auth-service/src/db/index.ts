import { Pool } from 'pg';
import { config } from '../config';
import { DatabaseError } from '../types/database';

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
});

export const query = async (text: string, params?: any[]) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    const dbError = error as DatabaseError;
    throw new Error(`Database error: ${dbError.message}`);
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export const initDatabase = async () => {
  try {
    // Создание таблицы users
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        status TEXT CHECK (char_length(status) <= 50),
        birth_date DATE,
        transcribe_voice BOOLEAN DEFAULT false,
        notification_sound_url TEXT,
        is_online BOOLEAN DEFAULT false,
        last_seen TIMESTAMP,
        show_typing BOOLEAN DEFAULT true,
        show_read_timestamps BOOLEAN DEFAULT false,
        language TEXT DEFAULT 'en',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Создание таблицы sessions
    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        device TEXT NOT NULL,
        ip TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}; 