import { ChatModel } from './models/chat.model';
import { query } from './db';
import { logger } from './utils/logger';

async function testBlockUser() {
  try {
    // 1. Создаем личный чат
    logger.info('Создаем тестовый личный чат...');
    const personalChat = await ChatModel.createPersonalChat(1, 2);
    
    // 2. Блокируем пользователя
    logger.info('Блокируем пользователя 2 в чате...');
    await ChatModel.blockUser(personalChat.id, 1, 2);
    
    // 3. Проверяем блокировку
    const blocked = await ChatModel.getBlockedUsers(personalChat.id);
    if (blocked.some(u => u.userId === 2)) {
      logger.info('✅ Блокировка работает!');
    }

    // 4. Разблокируем пользователя
    logger.info('Разблокируем пользователя 2...');
    await ChatModel.unblockUser(personalChat.id, 2);

    // 5. Проверяем разблокировку
    const afterUnblock = await ChatModel.getBlockedUsers(personalChat.id);
    if (!afterUnblock.some(u => u.userId === 2)) {
      logger.info('✅ Разблокировка работает!');
    }

  } catch (error) {
    logger.error('Ошибка тестирования:', error);
  } finally {
    // Очистка
    await query(`DELETE FROM blocked_users`);
    await query(`DELETE FROM chats`);
    process.exit(0);
  }
}

testBlockUser();
