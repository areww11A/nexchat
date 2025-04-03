import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3007,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: 'localhost', // Принудительно используем localhost
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'chat_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  ws: {
    port: parseInt(process.env.WS_PORT || '3002'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
};
