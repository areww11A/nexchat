import { config } from '../config';

// Установка переменных окружения для тестов
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.JWT_SECRET = 'test-secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'chat_db_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.REDIS_URL = 'redis://localhost:6379';

// Глобальные настройки для тестов
beforeAll(async () => {
  // Здесь можно добавить глобальную инициализацию
});

afterAll(async () => {
  // Здесь можно добавить глобальную очистку
});
