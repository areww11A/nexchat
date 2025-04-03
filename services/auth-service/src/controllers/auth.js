const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

class AuthController {
  static async register(req, res) {
    try {
      const { username, password, email } = req.body;
      const user = await User.register(username, password, email);
      
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
      await User.createSession(user.id, token, req.headers['user-agent'], req.ip);
      res.status(201).json({ token });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  static async login(req, res) {
    try {
      const { username, password } = req.body;
      const user = await User.findByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
      await User.createSession(user.id, token, req.headers['user-agent'], req.ip);
      res.status(200).json({ token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  static async recoverPassword(req, res) {
    try {
      const { email } = req.body;
      const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Email not found' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      await pool.query(
        'UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2',
        [token, result.rows[0].id]
      );
      
      res.status(200).json({ message: 'Password reset email sent' });
    } catch (error) {
      console.error('Password recovery error:', error);
      res.status(500).json({ error: 'Password recovery failed' });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      const result = await pool.query(
        'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
        [token]
      );
      
      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      await User.updatePassword(result.rows[0].id, newPassword);
      res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: 'Password reset failed' });
    }
  }

  static async getProfile(req, res) {
    try {
      console.log('Fetching profile for user ID:', req.user.id);
      const result = await pool.query(
        'SELECT username, email, status, avatar_url FROM users WHERE id = $1', 
        [req.user.id]
      );
      
      console.log('Query result:', result.rows);
      
      if (result.rows.length === 0) {
        console.log('User not found in database');
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
  // ... existing methods ...

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      
      if (user.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const match = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      await User.updatePassword(user.id, newPassword);
      res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { status, birthDate, language } = req.body;
      await User.updateProfile(req.user.id, { status, birthDate, language });
      
      res.status(200).json({ 
        message: 'Profile updated',
        profile: { status, birthDate, language }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  static async updateAvatar(req, res) {
    try {
      const { avatarUrl } = req.body;
      await User.updateAvatar(req.user.id, avatarUrl);
      
      res.status(200).json({ 
        message: 'Avatar URL updated',
        avatarUrl 
      });
    } catch (error) {
      console.error('Update avatar error:', error);
      res.status(500).json({ error: 'Failed to update avatar URL' });
    }
  }
}

module.exports = AuthController;
