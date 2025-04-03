import { MessageModel } from './models/message.model';
import { query } from './db';
import { logger } from './utils/logger';

async function testDeleteFunctionality() {
  try {
    // 1. Create test message
    logger.info('Creating test message...');
    const testMessage = {
      chatId: 1,
      userId: 1,
      content: 'Message to delete'
    };

    const createdMessage = await MessageModel.createMessage(
      testMessage.chatId,
      testMessage.userId,
      testMessage.content
    );

    // 2. Test deleting message
    logger.info('Testing message deletion...');
    const deleted = await MessageModel.deleteMessage(createdMessage.id);

    if (deleted) {
      logger.info('✅ Delete functionality works!');
      // Verify deletion
      const message = await MessageModel.getMessageById(createdMessage.id);
      if (message && message.isDeleted) {
        logger.info('Message successfully marked as deleted');
      } else {
        logger.info('Message not found or not marked as deleted');
      }
    } else {
      logger.info('❌ Delete failed');
    }

  } catch (error) {
    logger.error('Test failed:', error);
  } finally {
    // Cleanup
    await query(`DELETE FROM messages`);
    process.exit(0);
  }
}

testDeleteFunctionality();
