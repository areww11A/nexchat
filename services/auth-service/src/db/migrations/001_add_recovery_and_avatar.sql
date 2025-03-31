-- Добавление полей для восстановления пароля
ALTER TABLE users
ADD COLUMN recovery_code VARCHAR(6),
ADD COLUMN recovery_code_expires TIMESTAMP;

-- Добавление поля для аватара
ALTER TABLE users
ADD COLUMN avatar_url TEXT;

-- Создание индекса для быстрого поиска по recovery_code
CREATE INDEX idx_users_recovery_code ON users(recovery_code); 