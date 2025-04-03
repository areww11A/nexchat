const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const saltRounds = 10;

class User {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        status TEXT,
        birth_date DATE,
        transcribe_voice BOOLEAN DEFAULT false,
        notification_sound_url TEXT,
        is_online BOOLEAN DEFAULT false,
        last_seen TIMESTAMP,
        show_typing BOOLEAN DEFAULT true,
        show_read_timestamps BOOLEAN DEFAULT false,
        language TEXT DEFAULT 'en',
        avatar_url TEXT
      );
      
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        token VARCHAR(255) NOT NULL,
        device TEXT,
        ip TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        last_active TIMESTAMP DEFAULT NOW()
      );
    `;
    await pool.query(query);
  }

  static async register(username, password, email) {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const query = `
      INSERT INTO users (username, password_hash, email)
      VALUES ($1, $2, $3)
      RETURNING id, username, email
    `;
    const result = await pool.query(query, [username, hashedPassword, email]);
    return result.rows[0];
  }

  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  static async createSession(userId, token, device, ip) {
    const query = `
      INSERT INTO sessions (user_id, token, device, ip)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, token, device, ip]);
    return result.rows[0];
  }

  static async createPasswordResetToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour
    
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expiresAt, userId]
    );
    
    return token;
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hashedPassword, userId]
    );
  }

  static async updateProfile(userId, profileData) {
    const { status, birthDate, language } = profileData;
    await pool.query(
      `UPDATE users 
       SET status = $1, birth_date = $2, language = $3 
       WHERE id = $4`,
      [status, birthDate, language, userId]
    );
  }

  static async updateAvatar(userId, avatarUrl) {
    await pool.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [avatarUrl, userId]
    );
  }
}

module.exports = User;
