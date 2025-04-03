"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketManager = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class WebSocketManager {
    constructor(io) {
        this.io = io;
        this.clients = new Map();
        this.init();
    }
    init() {
        this.io.use(this.authenticate.bind(this));
        this.io.on('connection', this.handleConnection.bind(this));
    }
    async authenticate(socket, next) {
        try {
            logger_1.logger.debug('Auth token:', socket.handshake.auth.token);
            const token = socket.handshake.auth.token?.split(' ')[1];
            logger_1.logger.debug('Parsed token:', token);
            if (!token) {
                return next(new Error('Authentication token is required'));
            }
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            socket.userId = decoded.userId;
            next();
        }
        catch (error) {
            logger_1.logger.error('WebSocket authentication error:', error);
            next(new Error('Invalid authentication token'));
        }
    }
    handleConnection(socket) {
        if (!socket.userId) {
            socket.disconnect();
            return;
        }
        this.clients.set(socket.userId, socket);
        logger_1.logger.info(`Client connected: ${socket.userId}`);
        // Join user's personal room
        socket.join(`user:${socket.userId}`);
        socket.on('join_chat', (chatId) => {
            socket.join(`chat:${chatId}`);
            logger_1.logger.info(`User ${socket.userId} joined chat ${chatId}`);
        });
        socket.on('leave_chat', (chatId) => {
            socket.leave(`chat:${chatId}`);
            logger_1.logger.info(`User ${socket.userId} left chat ${chatId}`);
        });
        socket.on('typing', (chatId) => {
            socket.to(`chat:${chatId}`).emit('user_typing', {
                userId: socket.userId,
                chatId,
            });
        });
        socket.on('disconnect', () => {
            if (socket.userId) {
                this.clients.delete(socket.userId);
                logger_1.logger.info(`Client disconnected: ${socket.userId}`);
            }
        });
    }
    sendToUser(userId, event, data) {
        const socket = this.clients.get(userId);
        if (socket) {
            socket.emit(event, data);
        }
    }
    sendToChat(chatId, event, data) {
        this.io.to(`chat:${chatId}`).emit(event, data);
    }
    broadcast(event, data, excludeUserId) {
        this.io.emit(event, data);
    }
    notifyReactionAdded(chatId, messageId, userId, emoji) {
        this.sendToChat(chatId, 'reaction_added', {
            messageId,
            userId,
            emoji,
            timestamp: new Date().toISOString()
        });
    }
    notifyReactionRemoved(chatId, messageId, userId, emoji) {
        this.sendToChat(chatId, 'reaction_removed', {
            messageId,
            userId,
            emoji,
            timestamp: new Date().toISOString()
        });
    }
    notifyMessageForwarded(chatId, messageId, fromChatId, userId) {
        this.sendToChat(chatId, 'message_forwarded', {
            messageId,
            fromChatId,
            userId,
            timestamp: new Date().toISOString()
        });
    }
}
exports.WebSocketManager = WebSocketManager;
