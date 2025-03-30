# Auth Service

Сервис авторизации и управления пользователями для NexChat.

## Функциональность

- Регистрация пользователей
- Авторизация пользователей
- Управление профилем
- Управление сессиями
- WebSocket для статусов онлайн
- Мультиязычность (i18n)

## Технологии

- Node.js v18+
- Express v4.18
- TypeScript
- PostgreSQL
- Redis
- WebSocket (ws)
- JWT
- Jest

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/your-username/nexchat.git
cd nexchat/services/auth-service
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл .env на основе .env.example:
```bash
cp .env.example .env
```

4. Настройте переменные окружения в .env

## Разработка

1. Запустите сервис в режиме разработки:
```bash
npm run dev
```

2. Запустите тесты:
```bash
npm test
```

3. Соберите проект:
```bash
npm run build
```

## API Endpoints

### Auth

- POST /auth/register - Регистрация пользователя
- POST /auth/login - Вход в систему
- POST /auth/logout - Выход из системы
- PATCH /auth/password - Смена пароля

### Profile

- GET /auth/profile - Получение профиля
- PATCH /auth/profile - Обновление профиля
- GET /auth/user/:id - Получение профиля пользователя

## WebSocket Events

- connected - Подключение к WebSocket
- user_online - Пользователь в сети
- user_offline - Пользователь не в сети
- profile_updated - Профиль обновлен

## Тестирование

```bash
# Запуск всех тестов
npm test

# Запуск тестов с покрытием
npm run test:coverage

# Запуск тестов в режиме watch
npm run test:watch
```

## Docker

```bash
# Сборка образа
docker build -t nexchat-auth-service .

# Запуск контейнера
docker run -p 3001:3001 nexchat-auth-service
```

## Лицензия

MIT 