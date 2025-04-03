import { MessageModel } from './models/message.model';
import { query } from './db';
import { logger } from './utils/logger';

async function testSendFunctionality() {
  try {
    // 1. Test sending message
    logger.info('Testing message sending...');
    
    const testMessage = {
      chatId: 1,
      userId: 1,
      content: 'Test message content'
    };

    const sentMessage = await MessageModel.createMessage(
      testMessage.chatId,
      testMessage.userId,
      testMessage.content
    );

    if (sentMessage && sentMessage.content === testMessage.content) {
      logger.info('✅ Send functionality works!');
      logger.info('Sent message:', sentMessage);
    } else {
      logger.info('❌ Send failed');
      logger.info('Result:', sentMessage);
    }

  } catch (error) {
    logger.error('Test failed:', error);
  } finally {
    // Cleanup
    await query(`DELETE FROM messages`);
    process.exit(0);
  }
}

testSendFunctionality();
