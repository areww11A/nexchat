CREATE TABLE reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_reaction UNIQUE (message_id, user_id, emoji)
);

-- Добавляем колонки для пересылаемых сообщений
ALTER TABLE messages ADD COLUMN is_forwarded BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN original_chat_id INTEGER;
ALTER TABLE messages ADD COLUMN original_message_id INTEGER;
