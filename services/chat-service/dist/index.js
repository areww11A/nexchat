"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const db_1 = require("./db");
const routes_1 = __importDefault(require("./routes"));
const websocket_1 = require("./websocket");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/chat', routes_1.default);
// Health check
app.get('/health', (req, res) => {
    logger_1.logger.info('Health check request received');
    res.status(200).json({ status: 'ok' });
});
// WebSocket
const wsManager = new websocket_1.WebSocketManager(io);
// Start server
const startServer = async () => {
    try {
        await (0, db_1.initDatabase)();
        logger_1.logger.info('Database initialized successfully');
        httpServer.listen({
            port: config_1.config.port,
            host: '0.0.0.0'
        }, () => {
            logger_1.logger.info(`Chat service is running on port ${config_1.config.port}`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
