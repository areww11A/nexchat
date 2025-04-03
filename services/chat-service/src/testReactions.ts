import { MessageModel } from './models/message.model';
import { ChatModel } from './models/chat.model';
import { query } from './db';
import { logger } from './utils/logger';

async function testReactions() {
  try {
    // 1. Create test chat and message
    logger.info('Creating test chat and message...');
    const chat = await ChatModel.createPersonalChat(1, 2);
    const message = await MessageModel.createMessage(chat.id, 1, 'Test message');

    // 2. Test adding reaction
    logger.info('Testing adding reaction...');
    const reaction1 = await MessageModel.addReaction(message.id, 1, '👍');
    logger.info(`✅ Added reaction: ${reaction1.emoji}`);

    // 3. Test adding another reaction
    const reaction2 = await MessageModel.addReaction(message.id, 2, '❤️');
    logger.info(`✅ Added reaction: ${reaction2.emoji}`);

    // 4. Test duplicate reaction
    try {
      await MessageModel.addReaction(message.id, 1, '👍');
      logger.error('❌ Duplicate reaction test failed!');
    } catch (e) {
      logger.info('✅ Duplicate reaction blocking works!');
    }

    // 5. Test removing reaction
    const removed = await MessageModel.removeReaction(message.id, 1, '👍');
    if (removed) {
      logger.info('✅ Reaction removal works!');
    }

  } catch (error) {
    logger.error('Test error:', error);
  } finally {
    // Cleanup
    await query('DELETE FROM reactions');
    await query('DELETE FROM messages');
    await query('DELETE FROM chats');
    process.exit(0);
  }
}

testReactions();
