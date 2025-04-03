import { MessageModel } from './models/message.model';
import { query } from './db';
import { logger } from './utils/logger';

async function testEditFunctionality() {
  try {
    // 1. Создаем тестовое сообщение
    logger.info('Создаем тестовое сообщение...');
    const testMessage = {
      chatId: 1,
      userId: 1,
      content: 'Сообщение для редактирования'
    };

    const createdMessage = await MessageModel.createMessage(
      testMessage.chatId,
      testMessage.userId,
      testMessage.content
    );

    // 2. Пытаемся отредактировать сообщение
    logger.info('Пытаемся отредактировать сообщение...');
    const newContent = 'Отредактированное сообщение';
    const updatedMessage = await MessageModel.editMessage(createdMessage.id, newContent);

    if (updatedMessage && updatedMessage.content === newContent) {
      logger.info('✅ Редактирование работает!');
      logger.info('Исходное сообщение:', createdMessage);
      logger.info('Обновленное сообщение:', updatedMessage);
    } else {
      logger.info('❌ Редактирование не удалось');
    }

  } catch (error) {
    logger.error('Ошибка тестирования:', error);
  } finally {
    // Очистка
    await query(`DELETE FROM messages`);
    process.exit(0);
  }
}

testEditFunctionality();
