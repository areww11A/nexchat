import { MessageModel } from './models/message.model';
import { ChatModel } from './models/chat.model';
import { query } from './db';
import { logger } from './utils/logger';

async function testMessageDeletion() {
  try {
    // 1. Create test chat and messages
    logger.info('Creating test chat and messages...');
    const chat = await ChatModel.createPersonalChat(1, 2);
    const message1 = await MessageModel.createMessage(chat.id, 1, 'Message 1');
    const message2 = await MessageModel.createMessage(chat.id, 1, 'Message 2');
    const message3 = await MessageModel.createMessage(chat.id, 2, 'Message 3');

    // 2. Test deleteSelectedMessages
    logger.info('Testing deleteSelectedMessages...');
    await MessageModel.deleteSelectedMessages([message1.id, message2.id], 1);
    logger.info('✅ deleteSelectedMessages executed');

    // 3. Verify messages were deleted
    const deleted1 = await MessageModel.getMessageById(message1.id);
    const deleted2 = await MessageModel.getMessageById(message2.id);
    if (deleted1?.isDeleted && deleted2?.isDeleted) {
      logger.info('✅ Messages were properly deleted');
    }

    // 4. Test deleteMessagesByDate
    logger.info('Testing deleteMessagesByDate...');
    const now = new Date();
    const past = new Date(now.getTime() - 10000);
    const future = new Date(now.getTime() + 10000);
    
    await MessageModel.deleteMessagesByDate(chat.id, past, future);
    logger.info('✅ deleteMessagesByDate executed');

    // 5. Verify all messages in chat were deleted
    const messages = await MessageModel.getMessages(chat.id);
    if (messages.length === 0) {
      logger.info('✅ All messages in date range were deleted');
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

testMessageDeletion();
