const { getDb } = require('../db');

class Message {
  static async create(messageData) {
    const db = getDb();
    const [message] = await db('messages')
      .insert({
        chatId: messageData.chatId,
        userId: messageData.userId,
        content: messageData.content,
        replyToId: messageData.replyToId,
        forwardFromId: messageData.forwardFromId,
        metadata: messageData.metadata ? JSON.stringify(messageData.metadata) : null,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning('*');

    return this.normalizeMessage(message);
  }

  static async getById(messageId) {
    const db = getDb();
    const message = await db('messages')
      .select(
        'messages.*',
        'users.username as authorName',
        db.raw('(SELECT COUNT(*) FROM message_reactions WHERE messageId = messages.id) as reactionCount'),
        db.raw('(SELECT COUNT(*) FROM message_read_status WHERE messageId = messages.id) as readCount')
      )
      .leftJoin('users', 'messages.userId', 'users.id')
      .where('messages.id', messageId)
      .first();

    return message ? this.normalizeMessage(message) : null;
  }

  static async getByChatId(chatId, options = {}) {
    const db = getDb();
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const order = options.order || 'asc';

    const messages = await db('messages')
      .select(
        'messages.*',
        'users.username as authorName',
        db.raw('(SELECT COUNT(*) FROM message_reactions WHERE messageId = messages.id) as reactionCount'),
        db.raw('(SELECT COUNT(*) FROM message_read_status WHERE messageId = messages.id) as readCount')
      )
      .leftJoin('users', 'messages.userId', 'users.id')
      .where('messages.chatId', chatId)
      .orderBy('messages.created_at', order)
      .limit(limit)
      .offset(offset);

    return messages.map(message => this.normalizeMessage(message));
  }

  static async update(messageId, userId, content) {
    const db = getDb();
    const [message] = await db('messages')
      .where({ id: messageId, userId })
      .update({
        content,
        isEdited: true,
        updated_at: db.fn.now()
      })
      .returning('*');

    return message ? this.normalizeMessage(message) : null;
  }

  static async delete(messageId, userId, hardDelete = false) {
    const db = getDb();
    if (hardDelete) {
      await db('messages')
        .where({ id: messageId, userId })
        .del();
      return true;
    }

    const [message] = await db('messages')
      .where({ id: messageId, userId })
      .update({
        isDeleted: true,
        deletedAt: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning('*');

    return message ? this.normalizeMessage(message) : null;
  }

  static async addReaction(messageId, userId, reaction) {
    const db = getDb();
    const [result] = await db('message_reactions')
      .insert({
        messageId,
        userId,
        reaction,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning('*');

    return result;
  }

  static async removeReaction(messageId, userId, reaction) {
    const db = getDb();
    await db('message_reactions')
      .where({
        messageId,
        userId,
        reaction
      })
      .del();
  }

  static async getReactions(messageId) {
    const db = getDb();
    return db('message_reactions')
      .select(
        'message_reactions.*',
        'users.username'
      )
      .leftJoin('users', 'message_reactions.userId', 'users.id')
      .where('messageId', messageId)
      .orderBy('message_reactions.created_at', 'asc');
  }

  static async markAsRead(messageId, userId) {
    const db = getDb();
    const [result] = await db('message_read_status')
      .insert({
        messageId,
        userId,
        readAt: db.fn.now(),
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .onConflict(['messageId', 'userId'])
      .ignore()
      .returning('*');

    return result;
  }

  static async getReadStatus(messageId) {
    const db = getDb();
    return db('message_read_status')
      .select(
        'message_read_status.*',
        'users.username'
      )
      .leftJoin('users', 'message_read_status.userId', 'users.id')
      .where('messageId', messageId)
      .orderBy('message_read_status.readAt', 'asc');
  }

  static async search(query, options = {}) {
    const db = getDb();
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const messages = await db('messages')
      .select(
        'messages.*',
        'users.username as authorName',
        'chats.name as chatName'
      )
      .leftJoin('users', 'messages.userId', 'users.id')
      .leftJoin('chats', 'messages.chatId', 'chats.id')
      .where('messages.content', 'like', `%${query}%`)
      .orderBy('messages.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return messages.map(message => this.normalizeMessage(message));
  }

  static normalizeMessage(message) {
    if (!message) return null;
    return {
      ...message,
      isEdited: Boolean(message.isEdited),
      isDeleted: Boolean(message.isDeleted),
      metadata: message.metadata ? JSON.parse(message.metadata) : null
    };
  }
}

module.exports = Message; 