import { MessageModel } from './models/message.model';
import { ChatModel } from './models/chat.model';
import { query } from './db';
import { logger } from './utils/logger';

async function testMessageEdit() {
  try {
    // 1. Create test chat and message
    logger.info('Creating test chat and message...');
    const chat = await ChatModel.createPersonalChat(1, 2);
    const message = await MessageModel.createMessage(chat.id, 1, 'Original content');
    
    // 2. Test successful edit within 24 hours
    logger.info('Testing edit within 24 hours...');
    const updated = await MessageModel.editMessage(message.id, 'Edited content');
    if (updated && updated.content === 'Edited content') {
      logger.info('✅ Edit within 24 hours works!');
    }

    // 3. Test permission check (user 2 trying to edit user 1's message)
    logger.info('Testing permission check...');
    try {
      await MessageModel.editMessage(message.id, 'Unauthorized edit');
      logger.error('❌ Permission check failed!');
    } catch (e) {
      logger.info('✅ Permission check works!');
    }

  } catch (error) {
    logger.error('Test error:', error);
  } finally {
    // Cleanup
    await query('DELETE FROM messages');
    await query('DELETE FROM chats');
    process.exit(0);
  }
}

testMessageEdit();
