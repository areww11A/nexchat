import express from 'express';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import jwt from 'jsonwebtoken';
import authRouter from './routes/auth.js';
import chatRouter from './routes/chat.js';
import messageRouter from './routes/message.js';

dotenv.config();

const app = express();
app.use(express.json());
const port = 3000;

// Инициализация SQLite
const db = await open({
  filename: process.env.NODE_ENV === 'test' ? ':memory:' : './nexchat.db',
  driver: sqlite3.Database
});

// Создание таблиц
await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL CHECK(length(username) BETWEEN 3 AND 20),
    passwordHash TEXT NOT NULL,
    publicKey TEXT NOT NULL,
    privateKey TEXT NOT NULL,
    transcribeVoice BOOLEAN DEFAULT 0,
    notificationSoundUrl TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT CHECK(type IN ('personal', 'group')) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_members (
    chatId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    role TEXT CHECK(role IN ('member', 'admin', 'bot')),
    FOREIGN KEY(chatId) REFERENCES chats(id),
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chatId INTEGER NOT NULL,
    senderId INTEGER NOT NULL,
    content TEXT NOT NULL,
    encryptedContent TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(chatId) REFERENCES chats(id),
    FOREIGN KEY(senderId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reactions (
    messageId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    emoji TEXT NOT NULL,
    FOREIGN KEY(messageId) REFERENCES messages(id),
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS stickers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ownerId INTEGER NOT NULL,
    fileUrl TEXT NOT NULL,
    FOREIGN KEY(ownerId) REFERENCES users(id)
  );
`);

// WebSocket сервер
const wss = new WebSocketServer({ noServer: true });

// Аутентификация WebSocket
wss.on('connection', (ws, req) => {
  const token = new URL(req.url, 'http://localhost').searchParams.get('token');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexchat_secret_2025');
    ws.user = { id: decoded.userId, username: decoded.username };
    ws.send(JSON.stringify({ event: 'connected', userId: decoded.userId }));
  } catch (err) {
    ws.close(4401, 'Unauthorized');
    return;
  }

  ws.on('message', (message) => {
    console.log('Received message:', message.toString());
  });
});

// Подключаем роуты
app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/message', messageRouter);

// Базовый эндпоинт
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// HTTP сервер
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// WebSocket обработка
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

export { db, server, wss };
